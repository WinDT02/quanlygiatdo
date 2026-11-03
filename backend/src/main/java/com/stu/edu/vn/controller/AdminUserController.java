package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.UpdateUserStatusRequest;
import com.stu.edu.vn.dto.UserStatusResponse;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** ADMIN only (enforced by the /api/admin/** rule in SecurityConfig). */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserManagementService userManagementService;

    /** {id} is the USER id (EmployeeResponse.userId), not the employee id. */
    @PutMapping("/{id}/status")
    public UserStatusResponse updateStatus(@AuthenticationPrincipal UserPrincipal admin,
                                           @PathVariable Long id,
                                           @Valid @RequestBody UpdateUserStatusRequest request) {
        return userManagementService.updateStatus(admin, id, request);
    }
}
