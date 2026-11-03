package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.AssignEmployeeRequest;
import com.stu.edu.vn.dto.CreateOrderRequest;
import com.stu.edu.vn.dto.OrderResponse;
import com.stu.edu.vn.dto.PageResponse;
import com.stu.edu.vn.dto.UpdateOrderStatusRequest;
import com.stu.edu.vn.entity.Customer;
import com.stu.edu.vn.entity.Employee;
import com.stu.edu.vn.entity.LaundryService;
import com.stu.edu.vn.entity.Order;
import com.stu.edu.vn.entity.OrderItem;
import com.stu.edu.vn.entity.Promotion;
import com.stu.edu.vn.entity.enums.DeliveryMethod;
import com.stu.edu.vn.entity.enums.OrderStatus;
import com.stu.edu.vn.entity.enums.ServiceStatus;
import com.stu.edu.vn.entity.enums.UserStatus;
import com.stu.edu.vn.entity.enums.OrderPaymentStatus;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.ConflictException;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.CustomerRepository;
import com.stu.edu.vn.repository.EmployeeRepository;
import com.stu.edu.vn.repository.LaundryServiceRepository;
import com.stu.edu.vn.repository.OrderRepository;
import com.stu.edu.vn.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final String ROLE_CUSTOMER = "CUSTOMER";

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final LaundryServiceRepository serviceRepository;
    private final PromotionService promotionService;

    /** Shipping fee charged when the store picks the clothes up at the customer's address. */
    @Value("${app.order.shipping-fee:15000}")
    private BigDecimal pickupShippingFee;

    /** Address stored on the order when the customer drops the clothes off at the store. */
    @Value("${app.store.address:123 Đường Giặt Ủi, Phường 1, Quận 1, TP.HCM}")
    private String storeAddress;

    // ------------------------------------------------------------------ create

    /**
     * Creates an order for the logged-in customer.
     * Customer = taken from the JWT user. Unit prices = read from the database. Every amount is computed here.
     */
    @Transactional
    public OrderResponse create(UserPrincipal principal, CreateOrderRequest request) {
        Customer customer = customerRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new BadRequestException(
                        "Tài khoản này không có hồ sơ khách hàng nên không thể đặt đơn"));

        // 1. merge duplicated services (same serviceId sent twice -> one line with summed quantity)
        Map<Long, Integer> quantityByService = new LinkedHashMap<>();
        for (CreateOrderRequest.Item item : request.items()) {
            quantityByService.merge(item.serviceId(), item.quantity(), Integer::sum);
        }

        // 2. load real services (and their real prices) from the database
        Map<Long, LaundryService> servicesById = serviceRepository.findAllById(quantityByService.keySet())
                .stream()
                .collect(Collectors.toMap(LaundryService::getId, Function.identity()));

        // 3. delivery
        String address;
        BigDecimal shippingFee;
        if (request.deliveryMethod() == DeliveryMethod.PICKUP) {
            if (request.shippingAddress() == null || request.shippingAddress().isBlank()) {
                throw new BadRequestException("Vui lòng nhập địa chỉ lấy đồ");
            }
            address = request.shippingAddress().trim();
            shippingFee = pickupShippingFee;
        } else {
            address = storeAddress;
            shippingFee = BigDecimal.ZERO;
        }

        Order order = Order.builder()
                .customer(customer)
                .address(address)
                .note(blankToNull(request.note()))
                .deliveryMethod(request.deliveryMethod())
                .status(OrderStatus.PENDING)
                .pickupAt(request.pickupTime())
                .shippingFee(shippingFee)
                .build();

        // 4. items: unitPrice = service.price from DB
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> entry : quantityByService.entrySet()) {
            LaundryService service = servicesById.get(entry.getKey());
            if (service == null) {
                throw new BadRequestException("Dịch vụ #" + entry.getKey() + " không tồn tại");
            }
            if (service.getStatus() != ServiceStatus.ACTIVE) {
                throw new BadRequestException("Dịch vụ \"" + service.getName() + "\" hiện không hoạt động");
            }
            OrderItem item = OrderItem.builder()
                    .service(service)
                    .quantity(entry.getValue())
                    .unitPrice(service.getPrice())
                    .build();
            order.addItem(item);
            subtotal = subtotal.add(item.getLineTotal());
        }

        // 5. promotion (optional): same rules as POST /api/promotions/check, shipping is never discounted
        BigDecimal discount = BigDecimal.ZERO;
        if (request.promotionCode() != null && !request.promotionCode().isBlank()) {
            Promotion promotion = promotionService.getUsableByCode(request.promotionCode());
            discount = promotionService.calculateDiscount(promotion, subtotal);
            order.setPromotion(promotion);
        }

        // 6. totals
        order.setSubtotalAmount(subtotal);
        order.setDiscountAmount(discount);
        order.setTotalAmount(subtotal.subtract(discount).add(shippingFee));

        return OrderResponse.from(orderRepository.save(order));
    }

    // -------------------------------------------------------------------- read

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(UserPrincipal principal) {
        return customerRepository.findByUserId(principal.getId())
                .map(customer -> orderRepository
                        .findByCustomerIdAndDeletedFalseOrderByOrderedAtDescIdDesc(customer.getId()))
                .orElse(List.of())
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    /** CUSTOMER: only own orders. ADMIN / EMPLOYEE: any order. */
    @Transactional(readOnly = true)
    public OrderResponse getById(UserPrincipal principal, Long id) {
        Order order = findVisibleOrder(principal, id);
        return OrderResponse.from(order);
    }

    // ------------------------------------------------------------------ update

    /** ADMIN / EMPLOYEE moves an order through its lifecycle (see OrderStatus). */
    @Transactional
    public OrderResponse updateStatus(UserPrincipal principal, Long id, UpdateOrderStatusRequest request) {
        Order order = orderRepository.findDetailedByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        OrderStatus current = order.getStatus();
        OrderStatus next = request.status();
        if (!current.canTransitionTo(next)) {
            throw new BadRequestException(
                    "Không thể chuyển đơn từ " + current + " sang " + next);
        }
        order.setStatus(next);
        if (next == OrderStatus.COMPLETED && Boolean.TRUE.equals(request.cashCollected())) {
            recordCashPayment(order);   // finishing the order and taking the cash happen together
        }

        // the first staff member who handles the order is recorded as its employee
        if (order.getEmployee() == null) {
            employeeRepository.findByUserId(principal.getId()).ifPresent(order::setEmployee);
        }
        return OrderResponse.from(order);
    }

    /**
     * ADMIN / EMPLOYEE records that the customer paid cash (COD). Only for an UNPAID order that is not cancelled.
     * Orders paid through VNPay are already PAID, so they are rejected here with 409.
     */
    @Transactional
    public OrderResponse markCashPaid(UserPrincipal principal, Long id) {
        Order order = orderRepository.findDetailedByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Đơn hàng đã bị hủy nên không thể ghi nhận thanh toán");
        }
        if (order.getPaymentStatus() == OrderPaymentStatus.PAID) {
            throw new ConflictException("Đơn hàng này đã được thanh toán");
        }
        recordCashPayment(order);
        if (order.getEmployee() == null) {
            employeeRepository.findByUserId(principal.getId()).ifPresent(order::setEmployee);
        }
        return OrderResponse.from(order);
    }

    /** UNPAID -> PAID with the time of collection; does nothing when the order is already PAID. */
    private void recordCashPayment(Order order) {
        if (order.getPaymentStatus() == OrderPaymentStatus.UNPAID) {
            order.setPaymentStatus(OrderPaymentStatus.PAID);
            order.setPaidAt(LocalDateTime.now());
        }
    }

    /** CUSTOMER cancels his own order, only while it is still PENDING. */
    @Transactional
    public OrderResponse cancel(UserPrincipal principal, Long id) {
        Order order = findOwnedOrder(principal, id);
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy đơn đang ở trạng thái PENDING (chờ xác nhận)");
        }
        order.setStatus(OrderStatus.CANCELLED);
        return OrderResponse.from(order);
    }

    // ------------------------------------------------------- staff: list & assign

    /**
     * Paginated list of all orders for ADMIN / EMPLOYEE, newest first.
     * See {@link OrderSearchCriteria} for how {@code keyword} is interpreted.
     */
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> search(OrderStatus status, String keyword, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        OrderSearchCriteria criteria = OrderSearchCriteria.parse(keyword);
        if (criteria.matchesNothing()) {
            return PageResponse.empty(safePage, safeSize);
        }

        PageRequest pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "orderedAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<Order> orders = orderRepository.search(status, criteria.orderId(), criteria.phone(), criteria.name(), pageable);

        if (!orders.isEmpty()) {
            // initializes items + services of this page's orders with a single extra query
            orderRepository.findWithItemsByIdIn(orders.getContent().stream().map(Order::getId).toList());
        }
        return PageResponse.of(orders.map(OrderResponse::from));
    }

    /**
     * Assigns the employee in charge of an order.
     * ADMIN can assign anyone; an EMPLOYEE can only assign himself (take the order).
     */
    @Transactional
    public OrderResponse assignEmployee(UserPrincipal principal, Long orderId, AssignEmployeeRequest request) {
        Order order = orderRepository.findDetailedByIdAndDeletedFalse(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Không thể gán nhân viên cho đơn đã hoàn thành hoặc đã hủy");
        }

        Employee employee = employeeRepository.findById(request.employeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên"));
        if (employee.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản nhân viên này đang bị khóa");
        }

        if (!"ADMIN".equals(principal.getRole())) {
            boolean assigningSelf = employeeRepository.findByUserId(principal.getId())
                    .map(own -> own.getId().equals(employee.getId()))
                    .orElse(false);
            if (!assigningSelf) {
                throw new AccessDeniedException("Nhân viên chỉ được tự nhận đơn cho chính mình");
            }
        }

        order.setEmployee(employee);
        return OrderResponse.from(order);
    }

    // ----------------------------------------------------------------- helpers

    private Order findVisibleOrder(UserPrincipal principal, Long id) {
        return ROLE_CUSTOMER.equals(principal.getRole())
                ? findOwnedOrder(principal, id)
                : orderRepository.findDetailedByIdAndDeletedFalse(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
    }

    /** Someone else's order is reported as "not found" so its existence is not leaked. */
    private Order findOwnedOrder(UserPrincipal principal, Long id) {
        Order order = orderRepository.findDetailedByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        if (!order.getCustomer().getUser().getId().equals(principal.getId())) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng");
        }
        return order;
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
