package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.LaundryService;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Read-only price list for the chatbot. A native query on purpose: it depends only on the
 * {@code services} table (schema.sql), not on the entity's field or enum names.
 */
public interface ChatbotCatalogRepository extends Repository<LaundryService, Long> {

    interface ServiceRow {
        String getName();

        BigDecimal getPrice();

        String getUnit();
    }

    @Query(value = "select s.name as name, s.price as price, s.unit as unit "
            + "from services s where s.status = 'ACTIVE' order by s.name asc, s.id asc", nativeQuery = true)
    List<ServiceRow> findActiveServices();
}
