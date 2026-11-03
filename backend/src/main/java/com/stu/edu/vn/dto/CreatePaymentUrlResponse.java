package com.stu.edu.vn.dto;

import java.time.LocalDateTime;

/** React does {@code window.location.href = paymentUrl}. */
public record CreatePaymentUrlResponse(
        String paymentUrl,
        String txnRef,
        LocalDateTime expiresAt      // Vietnam time; the VNPay page stops accepting payment after this
) {
}
