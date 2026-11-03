package com.stu.edu.vn.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of POST /api/reviews. The customer is taken from the JWT, never from the request. */
public record CreateReviewRequest(
        @NotNull(message = "Thiếu mã đơn hàng")
        Long orderId,

        @NotNull(message = "Vui lòng chọn số sao")
        @Min(value = 1, message = "Số sao tối thiểu là 1")
        @Max(value = 5, message = "Số sao tối đa là 5")
        Integer rating,

        @NotBlank(message = "Vui lòng nhập nội dung đánh giá")
        @Size(max = 2000, message = "Nội dung đánh giá tối đa 2000 ký tự")
        String comment
) {
}
