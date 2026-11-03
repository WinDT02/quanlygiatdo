package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    Optional<Promotion> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    /** Promotions a customer can use right now: switched on and inside the date range. Ending soonest first. */
    @Query("""
            select p from Promotion p
            where p.active = true and p.startDate <= :now and p.endDate >= :now
            order by p.endDate asc, p.id asc
            """)
    List<Promotion> findUsableAt(@Param("now") LocalDateTime now);

    /** Admin view: everything, newest first. */
    List<Promotion> findAllByOrderByIdDesc();
}
