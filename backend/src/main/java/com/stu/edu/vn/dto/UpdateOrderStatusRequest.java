package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Body of PUT /api/orders/{id}/status.
 * {@code cashCollected} is optional: when true and the new status is COMPLETED, the order is also marked PAID
 * (the customer paid cash on delivery). It is ignored for any other status.
 */
public record UpdateOrderStatusRequest(
        @NotNull(message = "Vui lòng chọn trạng thái mới")
        OrderStatus status,

        Boolean cashCollected
) {
    public UpdateOrderStatusRequest(OrderStatus status) {
        this(status, null);
    }
}
