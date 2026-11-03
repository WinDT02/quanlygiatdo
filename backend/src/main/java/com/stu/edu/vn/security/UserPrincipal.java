package com.stu.edu.vn.security;

import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Authenticated principal. Controllers can receive it with {@code @AuthenticationPrincipal UserPrincipal p}
 * to get the current user id (from the JWT context) instead of trusting ids sent by the client.
 */
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String fullName;
    private final String password;      // BCrypt hash, null for Google accounts
    private final String role;          // ADMIN | EMPLOYEE | CUSTOMER
    private final boolean enabled;

    private UserPrincipal(Long id, String email, String fullName, String password, String role, boolean enabled) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.password = password;
        this.role = role;
        this.enabled = enabled;
    }

    public static UserPrincipal from(User user) {
        return new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPasswordHash(),
                user.getRole().getName().name(),
                user.getStatus() == UserStatus.ACTIVE
        );
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
