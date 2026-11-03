package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.UpdateUserStatusRequest;
import com.stu.edu.vn.dto.UserStatusResponse;
import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.RoleName;
import com.stu.edu.vn.entity.enums.UserStatus;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.UserRepository;
import com.stu.edu.vn.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;

    /**
     * Locks (BANNED) or unlocks (ACTIVE) an account. Takes effect immediately: the JWT filter reloads the
     * user from the database on every request, so an already-issued token of a banned user stops working.
     * <p>
     * Safety rules: an admin cannot change his own status, and ADMIN accounts cannot be locked through
     * this API (otherwise the system could end up with no usable admin).
     */
    @Transactional
    public UserStatusResponse updateStatus(UserPrincipal admin, Long userId, UpdateUserStatusRequest request) {
        if (admin.getId().equals(userId)) {
            throw new BadRequestException("Bạn không thể thay đổi trạng thái tài khoản của chính mình");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (user.getRole().getName() == RoleName.ADMIN) {
            throw new BadRequestException("Không thể khóa/mở khóa tài khoản quản trị viên");
        }

        if (request.status() == UserStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể đặt trạng thái ACTIVE hoặc BANNED");
        }
        user.setStatus(request.status());
        if (request.status() == UserStatus.ACTIVE && !user.isVerified()) {
            // an admin activating a never-verified account vouches for it manually
            user.setVerified(true);
            user.setOtpRegister(null);
            user.setOtpRegisterExpires(null);
            user.setOtpRegisterAttempts(0);
        }
        return new UserStatusResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().getName().name(),
                user.getStatus().name());
    }
}
