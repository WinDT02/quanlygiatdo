package com.stu.edu.vn.dto;

/**
 * @param reply  plain text, may contain line breaks ("\n") and "•" bullets
 * @param intent which rule answered (PRICE, PROMOTION, ORDER, PAYMENT, ... or FALLBACK); handy for logging and tests
 */
public record ChatbotResponse(String reply, String intent) {
}
