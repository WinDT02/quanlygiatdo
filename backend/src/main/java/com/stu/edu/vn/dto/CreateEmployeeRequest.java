package com.stu.edu.vn.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /api/admin/employees. */
public record CreateEmployeeRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        @Size(max = 191, message = "Email tối đa 191 ký tự")
        String email,

        /** Optional. Omit it (or send null) and the server generates a random password and returns it once. */
        @Size(min = 6, max = 72, message = "Mật khẩu phải từ 6 đến 72 ký tự")
        String password,

        @Pattern(regexp = "^$|^[0-9+\\-\\s]{8,20}$", message = "Số điện thoại không hợp lệ")
        String phone,

        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String address
) {
}
