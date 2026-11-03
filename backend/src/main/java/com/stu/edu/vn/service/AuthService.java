package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.AuthResponse;
import com.stu.edu.vn.dto.GoogleLoginRequest;
import com.stu.edu.vn.dto.VerifyRegisterRequest;
import com.stu.edu.vn.dto.LoginRequest;
import com.stu.edu.vn.dto.RegisterRequest;
import com.stu.edu.vn.dto.UserResponse;
import com.stu.edu.vn.entity.Customer;
import com.stu.edu.vn.entity.Role;
import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.AuthProvider;
import com.stu.edu.vn.entity.enums.RoleName;
import com.stu.edu.vn.entity.enums.UserStatus;
import com.stu.edu.vn.exception.AccountNotActivatedException;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.ConflictException;
import com.stu.edu.vn.exception.EmailAlreadyExistsException;
import com.stu.edu.vn.exception.UnauthorizedException;
import com.stu.edu.vn.repository.CustomerRepository;
import com.stu.edu.vn.repository.EmployeeRepository;
import com.stu.edu.vn.repository.RoleRepository;
import com.stu.edu.vn.repository.UserRepository;
import com.stu.edu.vn.security.GoogleTokenVerifier;
import com.stu.edu.vn.security.GoogleUserInfo;
import com.stu.edu.vn.security.JwtTokenProvider;
import com.stu.edu.vn.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final RegistrationVerificationService registrationVerificationService;

    /**
     * Creates a CUSTOMER account in status PENDING plus its linked Customer profile (1-1 through user_id),
     * atomically, and e-mails a 6-digit code. No token is issued: the account can only log in after
     * {@link #verifyRegister} has activated it.
     */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new BadRequestException("Mật khẩu nhập lại không khớp");
        }

        String email = normalizeEmail(request.email());
        User existing = userRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == UserStatus.PENDING) {
                throw new ConflictException(
                        "Email này đã đăng ký nhưng chưa xác thực. Vui lòng nhập mã OTP hoặc yêu cầu gửi lại mã.");
            }
            throw new EmailAlreadyExistsException(email);
        }

        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new IllegalStateException("Role CUSTOMER chưa có trong bảng roles"));

        User user = userRepository.save(User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(customerRole)
                .authProvider(AuthProvider.LOCAL)
                .status(UserStatus.PENDING)
                .verified(false)
                .build());

        Customer customer = customerRepository.save(Customer.builder()
                .user(user)
                .phone(blankToNull(request.phone()))
                .address(blankToNull(request.address()))
                .build());

        registrationVerificationService.issueOtp(user);

        return toUserResponse(user, customer.getPhone(), customer.getAddress());
    }

    /**
     * Authenticates through Spring Security (BCrypt check, banned-account check),
     * then issues an access token.
     * Wrong credentials -> BadCredentialsException (401); banned account -> DisabledException (403).
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (DisabledException ex) {
            throw explainDisabledAccount(email, request.password(), ex);
        }

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtTokenProvider.generateToken(principal);

        return AuthResponse.bearer(token, jwtTokenProvider.getExpiresInSeconds(), getCurrentUser(principal.getId()));
    }

    /**
     * Spring Security rejects a non-ACTIVE account before it looks at the password. So that the reason is only
     * revealed to someone who knows the password, we check it here: wrong password -> plain 401; right password ->
     * "not activated yet" (PENDING) or "locked" (BANNED).
     */
    private RuntimeException explainDisabledAccount(String email, String rawPassword, DisabledException original) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.getPasswordHash() == null
                || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            return new BadCredentialsException("Bad credentials");
        }
        return user.getStatus() == UserStatus.PENDING ? new AccountNotActivatedException() : original;
    }

    /**
     * Step 2 of registration: checks the e-mail code, activates the account and signs the customer in.
     * Not @Transactional on purpose: the activation commits in {@link RegistrationVerificationService}
     * (a wrong code must still count as an attempt), then the token is issued.
     */
    public AuthResponse verifyRegister(VerifyRegisterRequest request) {
        User user = registrationVerificationService.verifyAndActivate(request.email(), request.otp());
        String token = jwtTokenProvider.generateToken(UserPrincipal.from(user));
        return AuthResponse.bearer(token, jwtTokenProvider.getExpiresInSeconds(), getCurrentUser(user.getId()));
    }

    /**
     * Sign in (or sign up on first use) with a Google ID token sent by the React app.
     * <ol>
     *   <li>the token is verified by {@link GoogleTokenVerifier} (signature, expiry, our client id);</li>
     *   <li>known Google account (provider GOOGLE + sub) -> log in;</li>
     *   <li>unknown account -> create a CUSTOMER with no password plus its Customer profile;</li>
     *   <li>the e-mail already belongs to another account -> 409. We do NOT auto-link, because local
     *       registration does not verify e-mail yet, so linking would let anyone take over an account
     *       by registering someone else's address first.</li>
     * </ol>
     * Banned account -> DisabledException (403), same as the password login.
     */
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleUserInfo info = googleTokenVerifier.verify(request.idToken());
        if (info.email() == null || !info.emailVerified()) {
            throw new UnauthorizedException("Email của tài khoản Google chưa được xác minh");
        }
        String email = normalizeEmail(info.email());

        User user = userRepository.findByAuthProviderAndProviderId(AuthProvider.GOOGLE, info.subject()).orElse(null);
        if (user == null) {
            if (userRepository.existsByEmail(email)) {
                throw new ConflictException(
                        "Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng email và mật khẩu.");
            }
            user = createGoogleCustomer(info, email);
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Account is banned");
        }

        UserPrincipal principal = UserPrincipal.from(user);
        String token = jwtTokenProvider.generateToken(principal);
        return AuthResponse.bearer(token, jwtTokenProvider.getExpiresInSeconds(), getCurrentUser(user.getId()));
    }

    private User createGoogleCustomer(GoogleUserInfo info, String email) {
        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new IllegalStateException("Role CUSTOMER chưa có trong bảng roles"));

        String fullName = (info.name() == null || info.name().isBlank())
                ? email.substring(0, email.indexOf('@'))
                : info.name().trim();

        User user = userRepository.save(User.builder()
                .fullName(fullName)
                .email(email)
                .passwordHash(null)                    // Google accounts have no password
                .role(customerRole)
                .authProvider(AuthProvider.GOOGLE)
                .providerId(info.subject())
                .status(UserStatus.ACTIVE)
                .verified(true)                        // Google already verified the e-mail
                .build());

        customerRepository.save(Customer.builder().user(user).build());
        return user;
    }

    /** Profile of the user identified by the JWT (id comes from the security context, never from the client). */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        String phone = null;
        String address = null;
        if (user.getRole().getName() == RoleName.CUSTOMER) {
            var customer = customerRepository.findByUserId(userId).orElse(null);
            if (customer != null) {
                phone = customer.getPhone();
                address = customer.getAddress();
            }
        } else {
            var employee = employeeRepository.findByUserId(userId).orElse(null);
            if (employee != null) {
                phone = employee.getPhone();
                address = employee.getAddress();
            }
        }
        return toUserResponse(user, phone, address);
    }

    private UserResponse toUserResponse(User user, String phone, String address) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().getName().name(),
                user.getStatus().name(),
                user.getAuthProvider().name(),
                phone,
                address);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
