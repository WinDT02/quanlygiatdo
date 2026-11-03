package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.CreateReviewRequest;
import com.stu.edu.vn.dto.ReviewResponse;
import com.stu.edu.vn.dto.ServiceReviewsResponse;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /** CUSTOMER only (SecurityConfig). */
    @PostMapping
    public ResponseEntity<ReviewResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                 @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.create(principal, request));
    }

    /** Public. GET /api/reviews/service/1?page=0&size=10 */
    @GetMapping("/service/{serviceId}")
    public ServiceReviewsResponse byService(@PathVariable Long serviceId,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "10") int size) {
        return reviewService.getByService(serviceId, page, size);
    }
}
