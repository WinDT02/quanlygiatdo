package com.stu.edu.vn.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of PUT /api/profile. An empty phone / address clears the stored value. */
public record UpdateProfileRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
        String fullName,

        @Pattern(regexp = "^$|^[0-9+\\-\\s]{8,20}$", message = "Số điện thoại không hợp lệ")
        String phone,

        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String address
) {
}
