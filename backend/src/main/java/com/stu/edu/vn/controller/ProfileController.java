package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.ChangePasswordRequest;
import com.stu.edu.vn.dto.MessageResponse;
import com.stu.edu.vn.dto.UpdateProfileRequest;
import com.stu.edu.vn.dto.UserResponse;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Any logged-in user (SecurityConfig: anyRequest().authenticated()). Always acts on the caller's own account. */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public UserResponse get(@AuthenticationPrincipal UserPrincipal principal) {
        return profileService.get(principal);
    }

    @PutMapping
    public UserResponse update(@AuthenticationPrincipal UserPrincipal principal,
                               @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(principal, request);
    }

    @PutMapping("/password")
    public MessageResponse changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                          @Valid @RequestBody ChangePasswordRequest request) {
        profileService.changePassword(principal, request);
        return new MessageResponse("Đã đổi mật khẩu thành công");
    }
}
