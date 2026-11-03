package com.stu.edu.vn.dto;

import java.util.List;

public record ServiceReviewsResponse(
        Long serviceId,
        /** 1 decimal place, e.g. 4.3. It is 0.0 when the service has no review yet. */
        double averageRating,
        long totalReviews,
        int page,
        int size,
        int totalPages,
        List<ReviewResponse> reviews
) {
}
