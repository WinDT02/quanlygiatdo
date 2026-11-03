package com.stu.edu.vn.dto;

import jakarta.validation.constraints.NotBlank;

/** Body of POST /api/auth/google. {@code idToken} is the "credential" returned by Google Identity Services in React. */
public record GoogleLoginRequest(
        @NotBlank(message = "Thiếu Google id_token")
        String idToken
) {
}
