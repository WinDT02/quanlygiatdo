package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.Review;

import java.time.LocalDateTime;

/** Public-safe view: only the reviewer's name, no e-mail or phone. */
public record ReviewResponse(
        Long id,
        Long orderId,
        Integer rating,
        String comment,
        String customerName,
        String replyContent,
        LocalDateTime repliedAt,
        LocalDateTime createdAt
) {
    /** Call inside the @Transactional service method (reads lazy associations). */
    public static ReviewResponse from(Review r) {
        return new ReviewResponse(
                r.getId(),
                r.getOrder().getId(),
                r.getRating(),
                r.getComment(),
                r.getCustomer().getUser().getFullName(),
                r.getReplyContent(),
                r.getRepliedAt(),
                r.getCreatedAt());
    }
}
