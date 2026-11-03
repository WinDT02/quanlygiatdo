package com.stu.edu.vn.service;

import com.stu.edu.vn.config.VNPayConfig;
import com.stu.edu.vn.dto.CreatePaymentUrlResponse;
import com.stu.edu.vn.dto.VnpayResult;
import com.stu.edu.vn.entity.Order;
import com.stu.edu.vn.entity.Payment;
import com.stu.edu.vn.entity.enums.OrderPaymentStatus;
import com.stu.edu.vn.entity.enums.OrderStatus;
import com.stu.edu.vn.entity.enums.PaymentStatus;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.ConflictException;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.OrderRepository;
import com.stu.edu.vn.repository.PaymentRepository;
import com.stu.edu.vn.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNP_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final DateTimeFormatter TXN_SUFFIX = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");
    private static final int PAYMENT_WINDOW_MINUTES = 15;

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final VNPayConfig vnPayConfig;

    // ------------------------------------------------------------ create URL

    /**
     * Creates a payment attempt for the customer's own order and returns the VNPay URL to redirect to.
     * The amount is read from the order in the database, never from the client.
     */
    @Transactional
    public CreatePaymentUrlResponse createVnpayUrl(UserPrincipal principal, Long orderId, String clientIp) {
        vnPayConfig.requireConfigured();

        Order order = orderRepository.findDetailedByIdAndDeletedFalse(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        // someone else's order looks exactly like a missing one
        if (!order.getCustomer().getUser().getId().equals(principal.getId())) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Đơn hàng đã bị hủy nên không thể thanh toán");
        }
        if (order.getPaymentStatus() == OrderPaymentStatus.PAID) {
            throw new ConflictException("Đơn hàng này đã được thanh toán");
        }

        BigDecimal amount = order.getTotalAmount().setScale(0, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw new BadRequestException("Đơn hàng không có số tiền cần thanh toán");
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM);
        LocalDateTime expiresAt = now.plusMinutes(PAYMENT_WINDOW_MINUTES);
        String txnRef = "O" + orderId + "T" + now.format(TXN_SUFFIX);     // alphanumeric, unique per attempt

        paymentRepository.save(Payment.builder()
                .order(order)
                .txnRef(txnRef)
                .amount(amount)
                .status(PaymentStatus.PENDING)
                .build());

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        params.put("vnp_Amount", amount.multiply(BigDecimal.valueOf(100)).toBigInteger().toString()); // VNPay: x100
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", "Thanh toan don hang " + orderId);   // no accents / special characters
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        params.put("vnp_IpAddr", clientIp);
        params.put("vnp_CreateDate", now.format(VNP_DATE));
        params.put("vnp_ExpireDate", expiresAt.format(VNP_DATE));

        return new CreatePaymentUrlResponse(vnPayConfig.buildPaymentUrl(params), txnRef, expiresAt);
    }

    // -------------------------------------------------------------- callback

    /**
     * Processes what VNPay sends back (browser redirect to the return URL, or the server-to-server IPN).
     * Idempotent: an attempt that is no longer PENDING is never changed again, so the redirect and the IPN
     * can both arrive without double effects.
     * <p>
     * Order of checks: signature -> payment exists -> amount matches -> still pending -> result code.
     * Only a verified signature makes any field of the request trustworthy.
     */
    @Transactional
    public VnpayResult handleVnpayCallback(Map<String, String> params) {
        if (!vnPayConfig.verify(params)) {
            log.warn("VNPay callback with invalid signature, txnRef={}", params.get("vnp_TxnRef"));
            return new VnpayResult("97", "Invalid signature", false, null, null);
        }

        String txnRef = params.get("vnp_TxnRef");
        Payment payment = (txnRef == null) ? null : paymentRepository.findByTxnRefForUpdate(txnRef).orElse(null);
        if (payment == null) {
            return new VnpayResult("01", "Order not found", false, null, null);
        }
        Order order = payment.getOrder();
        String responseCode = params.get("vnp_ResponseCode");

        long expectedAmount = payment.getAmount().multiply(BigDecimal.valueOf(100)).longValue();
        if (!String.valueOf(expectedAmount).equals(params.get("vnp_Amount"))) {
            log.warn("VNPay amount mismatch for {}: expected {}, got {}", txnRef, expectedAmount, params.get("vnp_Amount"));
            return new VnpayResult("04", "Invalid amount", false, order.getId(), responseCode);
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            return new VnpayResult("02", "Order already confirmed",
                    payment.getStatus() == PaymentStatus.SUCCESS, order.getId(), payment.getResponseCode());
        }

        String transactionStatus = params.get("vnp_TransactionStatus");
        boolean success = "00".equals(responseCode) && (transactionStatus == null || "00".equals(transactionStatus));

        payment.setGatewayTxnNo(params.get("vnp_TransactionNo"));
        payment.setResponseCode(responseCode);
        payment.setBankCode(params.get("vnp_BankCode"));
        payment.setPayDate(params.get("vnp_PayDate"));

        if (success) {
            payment.setStatus(PaymentStatus.SUCCESS);
            if (order.getPaymentStatus() == OrderPaymentStatus.UNPAID) {
                order.setPaymentStatus(OrderPaymentStatus.PAID);
                order.setPaidAt(LocalDateTime.now());
            } else {
                log.warn("Order {} was already PAID but attempt {} also succeeded - check for a refund", order.getId(), txnRef);
            }
        } else {
            payment.setStatus(PaymentStatus.FAILED);     // the order stays UNPAID, the customer can try again
        }
        return new VnpayResult("00", "Confirm Success", success, order.getId(), responseCode);
    }
}
