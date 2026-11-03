package com.stu.edu.vn.controller;

import com.stu.edu.vn.config.VNPayConfig;
import com.stu.edu.vn.dto.CreatePaymentUrlResponse;
import com.stu.edu.vn.dto.VnpayResult;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;

/**
 * Access rules live in SecurityConfig: create-vnpay-url needs a login, the two VNPay endpoints are public
 * (VNPay / the browser coming back from VNPay carry no JWT - they are protected by the vnp_SecureHash).
 */
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final VNPayConfig vnPayConfig;

    /** The customer pays for his own order: returns the URL the React app must redirect the browser to. */
    @GetMapping("/create-vnpay-url")
    public CreatePaymentUrlResponse createVnpayUrl(@AuthenticationPrincipal UserPrincipal principal,
                                                   @RequestParam Long orderId,
                                                   HttpServletRequest request) {
        return paymentService.createVnpayUrl(principal, orderId, clientIp(request));
    }

    /**
     * Return URL: the customer's browser comes back here from VNPay. We verify and record the result, then
     * redirect to the React result page: {@code <frontend-result-url>?status=success|failed|error&orderId=..&code=..}.
     * The front end should still confirm with GET /api/orders/{id} (paymentStatus) instead of trusting the query string.
     */
    @GetMapping("/vnpay-callback")
    public ResponseEntity<Void> vnpayCallback(@RequestParam Map<String, String> params) {
        VnpayResult result = paymentService.handleVnpayCallback(params);

        String status;
        if (result.success()) {
            status = "success";
        } else if ("00".equals(result.rspCode()) || "02".equals(result.rspCode())) {
            status = "failed";          // genuine decline / cancel at VNPay
        } else {
            status = "error";           // bad signature, unknown payment, wrong amount
        }

        UriComponentsBuilder target = UriComponentsBuilder.fromUriString(vnPayConfig.getFrontendResultUrl())
                .queryParam("status", status);
        if (result.orderId() != null) {
            target.queryParam("orderId", result.orderId());
        }
        if (result.vnpResponseCode() != null) {
            target.queryParam("code", result.vnpResponseCode());
        }
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(target.build().toUriString())).build();
    }

    /**
     * IPN (server-to-server) - optional on localhost, VNPay cannot reach it there. In production set this URL
     * in the VNPay merchant portal. VNPay expects exactly this JSON shape.
     */
    @GetMapping("/vnpay-ipn")
    public Map<String, String> vnpayIpn(@RequestParam Map<String, String> params) {
        VnpayResult result = paymentService.handleVnpayCallback(params);
        return Map.of("RspCode", result.rspCode(), "Message", result.message());
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
        return ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) ? "127.0.0.1" : ip;
    }
}
