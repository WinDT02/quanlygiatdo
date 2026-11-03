package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.Employee;
import com.stu.edu.vn.entity.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    /** All staff with their account loaded (no N+1), sorted by name. */
    @Query("select e from Employee e join fetch e.user u order by u.fullName asc, e.id asc")
    List<Employee> findAllWithUser();

    /** Staff whose account has the given status (e.g. ACTIVE only, to pick someone for an order). */
    @Query("select e from Employee e join fetch e.user u where u.status = :status order by u.fullName asc, e.id asc")
    List<Employee> findAllWithUserByStatus(@Param("status") UserStatus status);
}
