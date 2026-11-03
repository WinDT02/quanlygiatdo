package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.OrderItem;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long serviceId,
        String serviceName,
        String unit,
        Integer quantity,
        BigDecimal unitPrice,   // price snapshot at order time
        BigDecimal lineTotal
) {
    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getService().getId(),
                item.getService().getName(),
                item.getService().getUnit(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal());
    }
}
