package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.enums.DeliveryMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Body of POST /api/orders.
 * Deliberately has NO price / total / customerId fields: the server computes money from the database
 * and takes the customer from the JWT.
 */
public record CreateOrderRequest(

        @NotEmpty(message = "Đơn hàng phải có ít nhất một dịch vụ")
        @Size(max = 50, message = "Tối đa 50 dịch vụ trong một đơn")
        List<@Valid Item> items,

        @NotNull(message = "Vui lòng chọn hình thức giao nhận")
        DeliveryMethod deliveryMethod,        // PICKUP | DROP_OFF

        /** Required for PICKUP. Ignored for DROP_OFF (the store address is used). */
        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String shippingAddress,

        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
        String note,

        @Future(message = "Thời gian lấy đồ phải ở tương lai")
        LocalDateTime pickupTime,             // ISO-8601, e.g. 2026-11-05T09:30:00

        /** Optional promotion code, validated on the server. */
        @Size(max = 50, message = "Mã khuyến mãi tối đa 50 ký tự")
        String promotionCode
) {

    public record Item(
            @NotNull(message = "Thiếu serviceId")
            Long serviceId,

            @NotNull(message = "Thiếu số lượng")
            @Min(value = 1, message = "Số lượng phải lớn hơn 0")
            @Max(value = 1000, message = "Số lượng tối đa 1000")
            Integer quantity
    ) {
    }
}
