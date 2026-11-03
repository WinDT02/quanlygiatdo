package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.Order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        String status,
        String deliveryMethod,
        String address,
        String note,
        LocalDateTime orderedAt,
        LocalDateTime pickupAt,
        LocalDateTime deliveryAt,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal shippingFee,
        BigDecimal totalAmount,
        String paymentStatus,        // UNPAID | PAID
        LocalDateTime paidAt,
        String promotionCode,
        boolean reviewed,
        Long customerId,
        String customerName,
        String customerPhone,
        String employeeName,
        List<OrderItemResponse> items
) {
    /** Must be called while the Hibernate session is open (inside the @Transactional service method). */
    public static OrderResponse from(Order o) {
        return new OrderResponse(
                o.getId(),
                o.getStatus().name(),
                o.getDeliveryMethod().name(),
                o.getAddress(),
                o.getNote(),
                o.getOrderedAt(),
                o.getPickupAt(),
                o.getDeliveryAt(),
                o.getSubtotalAmount(),
                o.getDiscountAmount(),
                o.getShippingFee(),
                o.getTotalAmount(),
                o.getPaymentStatus().name(),
                o.getPaidAt(),
                o.getPromotion() != null ? o.getPromotion().getCode() : null,
                o.isReviewed(),
                o.getCustomer().getId(),
                o.getCustomer().getUser().getFullName(),
                o.getCustomer().getPhone(),
                o.getEmployee() != null ? o.getEmployee().getUser().getFullName() : null,
                o.getItems().stream().map(OrderItemResponse::from).toList());
    }
}
