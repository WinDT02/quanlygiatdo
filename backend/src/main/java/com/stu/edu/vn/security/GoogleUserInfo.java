package com.stu.edu.vn.security;

/** The few claims we use from a verified Google ID token. */
public record GoogleUserInfo(
        String subject,         // "sub": stable Google account id, the key we link accounts by
        String email,
        boolean emailVerified,
        String name,
        String pictureUrl
) {
}
