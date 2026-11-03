package com.stu.edu.vn.config;

import com.stu.edu.vn.exception.ServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.TreeMap;

/**
 * VNPay settings + the signing rules of the VNPay 2.1.0 API:
 * <ol>
 *   <li>take every vnp_* field with a non-empty value, sorted by field name (A-Z);</li>
 *   <li>build {@code name=urlencode(value)} joined with {@code &} (US-ASCII percent-encoding);</li>
 *   <li>vnp_SecureHash = HMAC-SHA512(hashSecret, thatString) as lower-case hex;</li>
 *   <li>vnp_SecureHash / vnp_SecureHashType are never part of the signed string.</li>
 * </ol>
 * The same routine signs the payment URL we send and verifies the callback VNPay sends back.
 */
@Component
public class VNPayConfig {

    public static final String SECURE_HASH = "vnp_SecureHash";
    public static final String SECURE_HASH_TYPE = "vnp_SecureHashType";

    private final String tmnCode;
    private final String hashSecret;
    private final String payUrl;
    private final String returnUrl;
    private final String frontendResultUrl;

    public VNPayConfig(@Value("${app.vnpay.tmn-code:}") String tmnCode,
                       @Value("${app.vnpay.hash-secret:}") String hashSecret,
                       @Value("${app.vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") String payUrl,
                       @Value("${app.vnpay.return-url:http://localhost:8080/api/payment/vnpay-callback}") String returnUrl,
                       @Value("${app.vnpay.frontend-result-url:http://localhost:5173/payment/result}") String frontendResultUrl) {
        this.tmnCode = tmnCode.trim();
        this.hashSecret = hashSecret.trim();
        this.payUrl = payUrl.trim();
        this.returnUrl = returnUrl.trim();
        this.frontendResultUrl = frontendResultUrl.trim();
    }

    public String getTmnCode() {
        return tmnCode;
    }

    public String getPayUrl() {
        return payUrl;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public String getFrontendResultUrl() {
        return frontendResultUrl;
    }

    /** 503 when the merchant code / secret are missing, so the rest of the app still starts without VNPay. */
    public void requireConfigured() {
        if (tmnCode.isEmpty() || hashSecret.isEmpty()) {
            throw new ServiceUnavailableException(
                    "Thanh toán VNPay chưa được cấu hình (thiếu app.vnpay.tmn-code / app.vnpay.hash-secret)");
        }
    }

    // ------------------------------------------------------------------ signing

    /** Steps 1-2 above: sorted, URL-encoded {@code a=b&c=d} string used both for hashing and for the URL. */
    public static String buildQuery(Map<String, String> params) {
        Map<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : sorted.entrySet()) {
            String value = e.getValue();
            if (value == null || value.isEmpty()) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(e.getKey(), StandardCharsets.US_ASCII))
              .append('=')
              .append(URLEncoder.encode(value, StandardCharsets.US_ASCII));
        }
        return sb.toString();
    }

    /** Step 3 above. */
    public static String hmacSha512(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Cannot compute HMAC-SHA512", e);
        }
    }

    /** Signature for the given vnp_* fields (hash fields are ignored if present). */
    public String sign(Map<String, String> params) {
        return hmacSha512(hashSecret, buildQuery(withoutHashFields(params)));
    }

    /** Full payment URL: base url + signed query + vnp_SecureHash. */
    public String buildPaymentUrl(Map<String, String> params) {
        Map<String, String> clean = withoutHashFields(params);
        String query = buildQuery(clean);
        return payUrl + "?" + query + "&" + SECURE_HASH + "=" + hmacSha512(hashSecret, query);
    }

    /**
     * Checks the vnp_SecureHash of a callback. Only vnp_* fields take part (anything else on the URL is ignored);
     * the comparison is constant-time.
     */
    public boolean verify(Map<String, String> callbackParams) {
        String received = callbackParams.get(SECURE_HASH);
        if (received == null || received.isBlank() || hashSecret.isEmpty()) {
            return false;
        }
        Map<String, String> vnpOnly = new TreeMap<>();
        for (Map.Entry<String, String> e : callbackParams.entrySet()) {
            if (e.getKey().startsWith("vnp_")) {
                vnpOnly.put(e.getKey(), e.getValue());
            }
        }
        String expected = sign(vnpOnly);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                received.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    private static Map<String, String> withoutHashFields(Map<String, String> params) {
        Map<String, String> copy = new TreeMap<>(params);
        copy.remove(SECURE_HASH);
        copy.remove(SECURE_HASH_TYPE);
        return copy;
    }
}
