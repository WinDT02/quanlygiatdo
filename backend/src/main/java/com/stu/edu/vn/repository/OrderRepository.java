package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.Order;
import com.stu.edu.vn.entity.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /** Order with everything needed to build an OrderResponse, loaded in one go (no N+1). */
    @EntityGraph(attributePaths = {
            "items", "items.service",
            "customer", "customer.user",
            "employee", "employee.user",
            "promotion"})
    Optional<Order> findDetailedByIdAndDeletedFalse(Long id);

    /** Customer's own orders, newest first (soft-deleted orders are hidden). */
    @EntityGraph(attributePaths = {
            "items", "items.service",
            "customer", "customer.user",
            "employee", "employee.user",
            "promotion"})
    List<Order> findByCustomerIdAndDeletedFalseOrderByOrderedAtDescIdDesc(Long customerId);

    // ---------------------------------------------------------------- staff list

    /**
     * Paginated list for ADMIN / EMPLOYEE. Every filter is optional (null = ignore).
     * Only to-one associations are fetched here: fetching the items collection in the same query would
     * force Hibernate to paginate in memory. Items are loaded afterwards by {@link #findWithItemsByIdIn}.
     */
    @EntityGraph(attributePaths = {"customer", "customer.user", "employee", "employee.user", "promotion"})
    @Query(value = """
            select o from Order o join o.customer c join c.user u
            where o.deleted = false
              and (:status is null or o.status = :status)
              and (:orderId is null or o.id = :orderId)
              and (:phone is null or c.phone like concat('%', :phone, '%'))
              and (:name is null or lower(u.fullName) like concat('%', :name, '%'))
            """,
            countQuery = """
            select count(o) from Order o join o.customer c join c.user u
            where o.deleted = false
              and (:status is null or o.status = :status)
              and (:orderId is null or o.id = :orderId)
              and (:phone is null or c.phone like concat('%', :phone, '%'))
              and (:name is null or lower(u.fullName) like concat('%', :name, '%'))
            """)
    Page<Order> search(@Param("status") OrderStatus status,
                       @Param("orderId") Long orderId,
                       @Param("phone") String phone,
                       @Param("name") String name,
                       Pageable pageable);

    /**
     * Initializes the items (and their services) of orders that are already in the persistence context.
     * Second step of the "paginate, then fetch the collection" pattern.
     */
    @Query("""
            select distinct o from Order o
            left join fetch o.items i
            left join fetch i.service
            where o.id in :ids
            """)
    List<Order> findWithItemsByIdIn(@Param("ids") Collection<Long> ids);

    // ----------------------------------------------------------------- dashboard

    /** Sum of total_amount for one status; null when there are no rows. */
    @Query("select sum(o.totalAmount) from Order o where o.status = :status and o.deleted = false")
    BigDecimal sumTotalAmountByStatus(@Param("status") OrderStatus status);

    @Query("select o.status as status, count(o) as total from Order o where o.deleted = false group by o.status")
    List<StatusCountRow> countGroupedByStatus();

    /** (date, amount) of orders with the given status since {@code from}; summed per day in Java. */
    @Query("""
            select o.orderedAt as orderedAt, o.totalAmount as totalAmount
            from Order o
            where o.status = :status and o.deleted = false and o.orderedAt >= :from
            """)
    List<RevenueRow> findRevenueRows(@Param("status") OrderStatus status, @Param("from") LocalDateTime from);

    interface StatusCountRow {
        OrderStatus getStatus();

        Long getTotal();
    }

    interface RevenueRow {
        LocalDateTime getOrderedAt();

        BigDecimal getTotalAmount();
    }
}
