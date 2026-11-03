package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.LaundryService;
import com.stu.edu.vn.entity.enums.ServiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LaundryServiceRepository extends JpaRepository<LaundryService, Long> {

    List<LaundryService> findByStatusOrderByIdAsc(ServiceStatus status);

    List<LaundryService> findAllByOrderByIdAsc();
}
