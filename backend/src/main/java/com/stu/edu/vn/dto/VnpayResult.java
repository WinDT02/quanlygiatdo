package com.stu.edu.vn.dto;

/**
 * Internal result of processing a VNPay callback.
 *
 * @param rspCode      code for VNPay's IPN reply: 00 ok, 01 order not found, 02 already confirmed,
 *                     04 invalid amount, 97 invalid signature
 * @param success      the money was received (this call or an earlier one)
 * @param orderId      null when the payment could not be identified
 * @param vnpResponseCode what VNPay said (vnp_ResponseCode), for the front end to explain a failure
 */
public record VnpayResult(String rspCode, String message, boolean success, Long orderId, String vnpResponseCode) {
}
