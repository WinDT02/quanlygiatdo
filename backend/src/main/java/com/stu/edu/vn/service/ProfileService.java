package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.ChangePasswordRequest;
import com.stu.edu.vn.dto.UpdateProfileRequest;
import com.stu.edu.vn.dto.UserResponse;
import com.stu.edu.vn.entity.Customer;
import com.stu.edu.vn.entity.Employee;
import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.AuthProvider;
import com.stu.edu.vn.entity.enums.RoleName;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.CustomerRepository;
import com.stu.edu.vn.repository.EmployeeRepository;
import com.stu.edu.vn.repository.UserRepository;
import com.stu.edu.vn.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The logged-in user edits his own profile / password. Every method works on the principal, never on an id from the client. */
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    @Transactional(readOnly = true)
    public UserResponse get(UserPrincipal principal) {
        return authService.getCurrentUser(principal.getId());
    }

    /**
     * Name lives on the account; phone and address live on the Customer / Employee row.
     * An ADMIN has no such row, so only the name is stored for him.
     */
    @Transactional
    public UserResponse update(UserPrincipal principal, UpdateProfileRequest request) {
        User user = findUser(principal);
        user.setFullName(request.fullName().trim());

        String phone = blankToNull(request.phone());
        String address = blankToNull(request.address());
        RoleName role = user.getRole().getName();
        if (role == RoleName.CUSTOMER) {
            Customer customer = customerRepository.findByUserId(user.getId())
                    .orElseGet(() -> Customer.builder().user(user).build());
            customer.setPhone(phone);
            customer.setAddress(address);
            customerRepository.save(customer);
        } else if (role == RoleName.EMPLOYEE) {
            Employee employee = employeeRepository.findByUserId(user.getId())
                    .orElseGet(() -> Employee.builder().user(user).build());
            employee.setPhone(phone);
            employee.setAddress(address);
            employeeRepository.save(employee);
        }
        userRepository.save(user);
        return authService.getCurrentUser(user.getId());
    }

    /** Needs the current password. Google-only accounts have no password to change. */
    @Transactional
    public void changePassword(UserPrincipal principal, ChangePasswordRequest request) {
        User user = findUser(principal);
        if (user.getPasswordHash() == null || user.getAuthProvider() == AuthProvider.GOOGLE) {
            throw new BadRequestException("Tài khoản đăng nhập bằng Google không có mật khẩu để đổi");
        }
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BadRequestException("Mật khẩu nhập lại không khớp");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private User findUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"));
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
