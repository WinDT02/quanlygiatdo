package com.stu.edu.vn.entity;

import com.stu.edu.vn.entity.enums.PromotionType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "promotions")
public class Promotion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "subtitle", length = 200)
    private String subtitle;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    @Builder.Default
    private PromotionType type = PromotionType.PROMOTION;

    @Column(name = "discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    /** Manual switch used by the admin ("soft delete" = active=false). Independent from the date range. */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /** True when {@code now} falls inside [startDate, endDate]. */
    public boolean isWithinPeriod(LocalDateTime now) {
        return !now.isBefore(startDate) && !now.isAfter(endDate);
    }

    /** A customer can use the code only when it is switched on AND inside its date range. */
    public boolean isUsableAt(LocalDateTime now) {
        return active && isWithinPeriod(now);
    }
}
