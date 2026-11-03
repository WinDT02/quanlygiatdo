package com.stu.edu.vn.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.stu.edu.vn.exception.ServiceUnavailableException;
import com.stu.edu.vn.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Verifies a Google ID token: RSA signature (Google's public keys, cached by the library),
 * issuer, expiry, and that the audience is OUR OAuth client id (so a token issued to another app is rejected).
 */
@Component
public class GoogleTokenVerifier {

    private final String clientId;
    private volatile GoogleIdTokenVerifier verifier;   // built lazily so the app still starts without a client id

    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
    }

    public GoogleUserInfo verify(String idTokenString) {
        GoogleIdToken idToken;
        try {
            idToken = verifier().verify(idTokenString.trim());
        } catch (IllegalArgumentException e) {
            throw new UnauthorizedException("Google id_token không hợp lệ");     // not even a well-formed JWT
        } catch (GeneralSecurityException | IOException e) {
            throw new ServiceUnavailableException(
                    "Không thể xác thực với Google lúc này, vui lòng thử lại sau", e);
        }
        if (idToken == null) {                                                   // bad signature / audience / expired
            throw new UnauthorizedException("Google id_token không hợp lệ hoặc đã hết hạn");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        return new GoogleUserInfo(
                payload.getSubject(),
                payload.getEmail(),
                Boolean.TRUE.equals(payload.getEmailVerified()),
                (String) payload.get("name"),
                (String) payload.get("picture"));
    }

    private GoogleIdTokenVerifier verifier() {
        if (clientId.isEmpty()) {
            throw new ServiceUnavailableException("Đăng nhập Google chưa được cấu hình (thiếu app.google.client-id)");
        }
        GoogleIdTokenVerifier local = verifier;
        if (local == null) {
            synchronized (this) {
                local = verifier;
                if (local == null) {
                    local = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                            .setAudience(Collections.singletonList(clientId))
                            .build();
                    verifier = local;
                }
            }
        }
        return local;
    }
}
