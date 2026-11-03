package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.AssignEmployeeRequest;
import com.stu.edu.vn.dto.CreateOrderRequest;
import com.stu.edu.vn.dto.OrderResponse;
import com.stu.edu.vn.dto.PageResponse;
import com.stu.edu.vn.dto.UpdateOrderStatusRequest;
import com.stu.edu.vn.entity.enums.OrderStatus;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.create(principal, request));
    }

    /**
     * ADMIN / EMPLOYEE: all orders, newest first.
     * GET /api/orders?page=0&size=20&status=PENDING&keyword=0912345678
     * keyword: up to 7 digits = order id, 8+ digits = phone number.
     */
    @GetMapping
    public PageResponse<OrderResponse> list(@RequestParam(required = false) OrderStatus status,
                                            @RequestParam(required = false) String keyword,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return orderService.search(status, keyword, page, size);
    }

    @GetMapping("/my-orders")
    public List<OrderResponse> myOrders(@AuthenticationPrincipal UserPrincipal principal) {
        return orderService.getMyOrders(principal);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return orderService.getById(principal, id);
    }

    /** ADMIN / EMPLOYEE only (enforced in SecurityConfig). */
    @PutMapping("/{id}/status")
    public OrderResponse updateStatus(@AuthenticationPrincipal UserPrincipal principal,
                                      @PathVariable Long id,
                                      @Valid @RequestBody UpdateOrderStatusRequest request) {
        return orderService.updateStatus(principal, id, request);
    }

    /** ADMIN / EMPLOYEE confirms the cash for a COD order has been collected (UNPAID -> PAID). */
    @PutMapping("/{id}/mark-paid")
    public OrderResponse markPaid(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return orderService.markCashPaid(principal, id);
    }

    /** ADMIN assigns anyone; EMPLOYEE can only assign himself. */
    @PutMapping("/{id}/assign")
    public OrderResponse assign(@AuthenticationPrincipal UserPrincipal principal,
                                @PathVariable Long id,
                                @Valid @RequestBody AssignEmployeeRequest request) {
        return orderService.assignEmployee(principal, id, request);
    }

    @PutMapping("/{id}/cancel")
    public OrderResponse cancel(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return orderService.cancel(principal, id);
    }
}
