package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByOrderId(Long orderId);

    /** Visible (not hidden) reviews of orders that contain the given service. */
    @EntityGraph(attributePaths = {"customer", "customer.user"})
    @Query(value = """
            select r from Review r
            where r.hidden = false
              and exists (select 1 from OrderItem i where i.order.id = r.order.id and i.service.id = :serviceId)
            """,
            countQuery = """
            select count(r) from Review r
            where r.hidden = false
              and exists (select 1 from OrderItem i where i.order.id = r.order.id and i.service.id = :serviceId)
            """)
    Page<Review> findVisibleByServiceId(@Param("serviceId") Long serviceId, Pageable pageable);

    /** Average star rating of the visible reviews of a service; null when there are none. */
    @Query("""
            select avg(r.rating) from Review r
            where r.hidden = false
              and exists (select 1 from OrderItem i where i.order.id = r.order.id and i.service.id = :serviceId)
            """)
    Double averageRatingByServiceId(@Param("serviceId") Long serviceId);
}
