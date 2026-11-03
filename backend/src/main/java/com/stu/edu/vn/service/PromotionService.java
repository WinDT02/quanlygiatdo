package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.CheckPromotionRequest;
import com.stu.edu.vn.dto.CheckPromotionResponse;
import com.stu.edu.vn.dto.PromotionRequest;
import com.stu.edu.vn.dto.PromotionResponse;
import com.stu.edu.vn.entity.Promotion;
import com.stu.edu.vn.entity.enums.PromotionType;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.ConflictException;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Single place that decides whether a promotion code is usable and how much it takes off.
 * Used by the promotions API AND by OrderService, so "check" and "place order" can never disagree.
 */
@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;

    // ------------------------------------------------------------ public side

    /** Public list: only promotions that are switched on and currently inside their date range. */
    @Transactional(readOnly = true)
    public List<PromotionResponse> listUsable() {
        LocalDateTime now = LocalDateTime.now();
        return promotionRepository.findUsableAt(now).stream()
                .map(p -> PromotionResponse.from(p, now))
                .toList();
    }

    /** Admin list: everything, including switched-off and expired promotions. */
    @Transactional(readOnly = true)
    public List<PromotionResponse> listAll() {
        LocalDateTime now = LocalDateTime.now();
        return promotionRepository.findAllByOrderByIdDesc().stream()
                .map(p -> PromotionResponse.from(p, now))
                .toList();
    }

    /** Non-admins only "see" promotions they could actually use; anything else is a 404. */
    @Transactional(readOnly = true)
    public PromotionResponse getById(Long id, boolean admin) {
        LocalDateTime now = LocalDateTime.now();
        Promotion promotion = findById(id);
        if (!admin && !promotion.isUsableAt(now)) {
            throw new ResourceNotFoundException("Không tìm thấy khuyến mãi");
        }
        return PromotionResponse.from(promotion, now);
    }

    /**
     * Customer asks "is this code OK?" before ordering. Never throws for a bad code:
     * the answer is {@code valid=false} plus the reason.
     */
    @Transactional(readOnly = true)
    public CheckPromotionResponse check(CheckPromotionRequest request) {
        Promotion promotion;
        try {
            promotion = getUsableByCode(request.code());
        } catch (BadRequestException ex) {
            return CheckPromotionResponse.invalid(ex.getMessage());
        }

        BigDecimal discountAmount = request.subtotal() == null
                ? null
                : calculateDiscount(promotion, request.subtotal());
        return CheckPromotionResponse.valid(
                promotion.getCode(), promotion.getTitle(), promotion.getDiscountPercent(), discountAmount);
    }

    // ------------------------------------------------- shared with OrderService

    /**
     * Returns the promotion for this code, or throws BadRequestException explaining why it cannot be used.
     * Codes are case-insensitive (stored upper-case).
     */
    @Transactional(readOnly = true)
    public Promotion getUsableByCode(String rawCode) {
        String code = normalizeCode(rawCode);
        Promotion promotion = promotionRepository.findByCode(code)
                .orElseThrow(() -> new BadRequestException("Mã khuyến mãi không tồn tại"));

        LocalDateTime now = LocalDateTime.now();
        if (!promotion.isActive()) {
            throw new BadRequestException("Mã khuyến mãi không còn được áp dụng");
        }
        if (now.isBefore(promotion.getStartDate())) {
            throw new BadRequestException("Mã khuyến mãi chưa có hiệu lực");
        }
        if (now.isAfter(promotion.getEndDate())) {
            throw new BadRequestException("Mã khuyến mãi đã hết hạn");
        }
        return promotion;
    }

    /** Percentage of the subtotal, rounded to whole VND, never more than the subtotal. Shipping is not discounted. */
    public BigDecimal calculateDiscount(Promotion promotion, BigDecimal subtotal) {
        return subtotal.multiply(promotion.getDiscountPercent())
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .min(subtotal);
    }

    // ------------------------------------------------------------- admin CRUD

    @Transactional
    public PromotionResponse create(PromotionRequest request) {
        String code = normalizeCode(request.code());
        validatePeriod(request);
        if (promotionRepository.existsByCode(code)) {
            throw new ConflictException("Mã khuyến mãi \"" + code + "\" đã tồn tại");
        }

        Promotion promotion = Promotion.builder()
                .code(code)
                .title(blankToNull(request.title()))
                .subtitle(blankToNull(request.subtitle()))
                .description(blankToNull(request.description()))
                .type(request.type() != null ? request.type() : PromotionType.PROMOTION)
                .discountPercent(request.discountPercent())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .active(request.active() == null || request.active())
                .build();
        return PromotionResponse.from(promotionRepository.save(promotion), LocalDateTime.now());
    }

    @Transactional
    public PromotionResponse update(Long id, PromotionRequest request) {
        Promotion promotion = findById(id);
        String code = normalizeCode(request.code());
        validatePeriod(request);
        if (promotionRepository.existsByCodeAndIdNot(code, id)) {
            throw new ConflictException("Mã khuyến mãi \"" + code + "\" đã tồn tại");
        }

        // Orders keep their own discount amount, so editing a promotion never changes past orders.
        promotion.setCode(code);
        promotion.setTitle(blankToNull(request.title()));
        promotion.setSubtitle(blankToNull(request.subtitle()));
        promotion.setDescription(blankToNull(request.description()));
        if (request.type() != null) {
            promotion.setType(request.type());
        }
        promotion.setDiscountPercent(request.discountPercent());
        promotion.setStartDate(request.startDate());
        promotion.setEndDate(request.endDate());
        if (request.active() != null) {
            promotion.setActive(request.active());
        }
        return PromotionResponse.from(promotion, LocalDateTime.now());
    }

    /** Soft delete: past orders reference the promotion, so the row stays and is only switched off. */
    @Transactional
    public void deactivate(Long id) {
        findById(id).setActive(false);
    }

    // ----------------------------------------------------------------- helpers

    private Promotion findById(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khuyến mãi"));
    }

    private void validatePeriod(PromotionRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new BadRequestException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase();
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
