package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.CreateReviewRequest;
import com.stu.edu.vn.dto.ReviewResponse;
import com.stu.edu.vn.dto.ServiceReviewsResponse;
import com.stu.edu.vn.entity.Customer;
import com.stu.edu.vn.entity.Order;
import com.stu.edu.vn.entity.Review;
import com.stu.edu.vn.entity.enums.OrderStatus;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.ConflictException;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.CustomerRepository;
import com.stu.edu.vn.repository.LaundryServiceRepository;
import com.stu.edu.vn.repository.OrderRepository;
import com.stu.edu.vn.repository.ReviewRepository;
import com.stu.edu.vn.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final LaundryServiceRepository serviceRepository;

    /**
     * A customer reviews one of HIS OWN orders, which must be COMPLETED, at most once.
     * Marks orders.is_reviewed = true so the front-end can hide the "Review" button.
     */
    @Transactional
    public ReviewResponse create(UserPrincipal principal, CreateReviewRequest request) {
        Customer customer = customerRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new BadRequestException("Chỉ tài khoản khách hàng mới có thể đánh giá"));

        // someone else's (or a missing / soft-deleted) order is reported as "not found"
        Order order = orderRepository.findById(request.orderId())
                .filter(o -> !o.isDeleted() && o.getCustomer().getId().equals(customer.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BadRequestException("Chỉ có thể đánh giá đơn hàng đã hoàn thành (COMPLETED)");
        }
        if (order.isReviewed() || reviewRepository.existsByOrderId(order.getId())) {
            throw new ConflictException("Đơn hàng này đã được đánh giá");
        }

        Review review = reviewRepository.save(Review.builder()
                .order(order)
                .customer(customer)
                .rating(request.rating())
                .comment(request.comment().trim())
                .build());

        order.setReviewed(true);
        return ReviewResponse.from(review);
    }

    /** Public: visible reviews of a service (newest first) + average rating. */
    @Transactional(readOnly = true)
    public ServiceReviewsResponse getByService(Long serviceId, int page, int size) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Không tìm thấy dịch vụ");
        }
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);

        Page<Review> reviews = reviewRepository.findVisibleByServiceId(serviceId,
                PageRequest.of(safePage, safeSize,
                        Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));

        Double average = reviewRepository.averageRatingByServiceId(serviceId);
        double averageRating = average == null ? 0.0
                : BigDecimal.valueOf(average).setScale(1, RoundingMode.HALF_UP).doubleValue();

        return new ServiceReviewsResponse(
                serviceId,
                averageRating,
                reviews.getTotalElements(),
                reviews.getNumber(),
                reviews.getSize(),
                reviews.getTotalPages(),
                reviews.getContent().stream().map(ReviewResponse::from).toList());
    }
}
