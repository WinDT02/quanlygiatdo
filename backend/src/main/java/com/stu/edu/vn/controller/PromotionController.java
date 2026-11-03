package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.CheckPromotionRequest;
import com.stu.edu.vn.dto.CheckPromotionResponse;
import com.stu.edu.vn.dto.PromotionRequest;
import com.stu.edu.vn.dto.PromotionResponse;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Access rules live in SecurityConfig:
 * GET = public, POST /check = any logged-in user, other POST/PUT/DELETE = ADMIN.
 */
@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;

    /**
     * Public: only promotions that are active and still valid.
     * An authenticated ADMIN can add ?all=true to see every promotion (expired / switched off too).
     */
    @GetMapping
    public List<PromotionResponse> list(@RequestParam(defaultValue = "false") boolean all,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return (all && isAdmin(principal)) ? promotionService.listAll() : promotionService.listUsable();
    }

    @GetMapping("/{id}")
    public PromotionResponse get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return promotionService.getById(id, isAdmin(principal));
    }

    /** Customer validates a code before ordering. Always 200; read the {@code valid} flag. */
    @PostMapping("/check")
    public CheckPromotionResponse check(@Valid @RequestBody CheckPromotionRequest request) {
        return promotionService.check(request);
    }

    @PostMapping
    public ResponseEntity<PromotionResponse> create(@Valid @RequestBody PromotionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promotionService.create(request));
    }

    @PutMapping("/{id}")
    public PromotionResponse update(@PathVariable Long id, @Valid @RequestBody PromotionRequest request) {
        return promotionService.update(id, request);
    }

    /** Soft delete -> is_active = false (past orders still reference the promotion). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        promotionService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    /** principal is null for anonymous requests. */
    private boolean isAdmin(UserPrincipal principal) {
        return principal != null && "ADMIN".equals(principal.getRole());
    }
}
