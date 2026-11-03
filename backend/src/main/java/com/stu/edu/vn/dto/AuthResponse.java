package com.stu.edu.vn.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,   // always "Bearer"
        long expiresIn,     // seconds
        UserResponse user
) {
    public static AuthResponse bearer(String accessToken, long expiresInSeconds, UserResponse user) {
        return new AuthResponse(accessToken, "Bearer", expiresInSeconds, user);
    }
}
