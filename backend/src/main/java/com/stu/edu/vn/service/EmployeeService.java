package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.CreateEmployeeRequest;
import com.stu.edu.vn.dto.EmployeeCreatedResponse;
import com.stu.edu.vn.dto.EmployeeResponse;
import com.stu.edu.vn.entity.Employee;
import com.stu.edu.vn.entity.Role;
import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.AuthProvider;
import com.stu.edu.vn.entity.enums.RoleName;
import com.stu.edu.vn.entity.enums.UserStatus;
import com.stu.edu.vn.exception.EmailAlreadyExistsException;
import com.stu.edu.vn.repository.EmployeeRepository;
import com.stu.edu.vn.repository.RoleRepository;
import com.stu.edu.vn.repository.UserRepository;
import com.stu.edu.vn.util.TemporaryPasswordGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    /** @param status null = every employee, otherwise only accounts with that status. */
    @Transactional(readOnly = true)
    public List<EmployeeResponse> list(UserStatus status) {
        List<Employee> employees = (status == null)
                ? employeeRepository.findAllWithUser()
                : employeeRepository.findAllWithUserByStatus(status);
        return employees.stream().map(EmployeeResponse::from).toList();
    }

    /** Creates the login account (role EMPLOYEE) and its Employee profile (1-1 through user_id), atomically. */
    @Transactional
    public EmployeeCreatedResponse create(CreateEmployeeRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        Role employeeRole = roleRepository.findByName(RoleName.EMPLOYEE)
                .orElseThrow(() -> new IllegalStateException("Role EMPLOYEE chưa có trong bảng roles"));

        boolean generated = request.password() == null || request.password().isBlank();
        String rawPassword = generated ? TemporaryPasswordGenerator.generate() : request.password();

        User user = userRepository.save(User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(employeeRole)
                .authProvider(AuthProvider.LOCAL)
                .status(UserStatus.ACTIVE)
                .verified(true)          // created by an admin, so there is nothing to verify by e-mail
                .build());

        Employee employee = employeeRepository.save(Employee.builder()
                .user(user)
                .phone(blankToNull(request.phone()))
                .address(blankToNull(request.address()))
                .build());

        return new EmployeeCreatedResponse(EmployeeResponse.from(employee), generated ? rawPassword : null);
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
