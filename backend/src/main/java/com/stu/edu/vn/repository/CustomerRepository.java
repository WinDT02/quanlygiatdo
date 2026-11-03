package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    /** Customers registered at or after {@code from} (dashboard "new customers"). */
    long countByCreatedAtGreaterThanEqual(LocalDateTime from);
}
