package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.ServiceRequest;
import com.stu.edu.vn.dto.ServiceResponse;
import com.stu.edu.vn.entity.LaundryService;
import com.stu.edu.vn.entity.enums.ServiceStatus;
import com.stu.edu.vn.exception.ResourceNotFoundException;
import com.stu.edu.vn.repository.LaundryServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Catalogue of laundry services (entity LaundryService, table "services"). */
@Service
@RequiredArgsConstructor
public class ServiceCatalogService {

    private final LaundryServiceRepository repository;

    @Transactional(readOnly = true)
    public List<ServiceResponse> list(boolean includeInactive) {
        List<LaundryService> services = includeInactive
                ? repository.findAllByOrderByIdAsc()
                : repository.findByStatusOrderByIdAsc(ServiceStatus.ACTIVE);
        return services.stream().map(ServiceResponse::from).toList();
    }

    /** Anonymous users never see INACTIVE services (they get 404). */
    @Transactional(readOnly = true)
    public ServiceResponse getById(Long id, boolean includeInactive) {
        LaundryService service = findOrThrow(id);
        if (!includeInactive && service.getStatus() != ServiceStatus.ACTIVE) {
            throw new ResourceNotFoundException("Không tìm thấy dịch vụ");
        }
        return ServiceResponse.from(service);
    }

    @Transactional
    public ServiceResponse create(ServiceRequest request) {
        LaundryService service = LaundryService.builder()
                .name(request.name().trim())
                .price(request.price())
                .unit(request.unit().trim())
                .description(blankToNull(request.description()))
                .imageUrl(blankToNull(request.imageUrl()))
                .status(request.status() != null ? request.status() : ServiceStatus.ACTIVE)
                .build();
        return ServiceResponse.from(repository.save(service));
    }

    /**
     * Changing the price only affects future orders:
     * existing order items keep the unit_price snapshot taken when they were created.
     */
    @Transactional
    public ServiceResponse update(Long id, ServiceRequest request) {
        LaundryService service = findOrThrow(id);
        service.setName(request.name().trim());
        service.setPrice(request.price());
        service.setUnit(request.unit().trim());
        service.setDescription(blankToNull(request.description()));
        service.setImageUrl(blankToNull(request.imageUrl()));
        if (request.status() != null) {
            service.setStatus(request.status());
        }
        return ServiceResponse.from(service);
    }

    /** Soft delete: the row is kept (order_items reference it) and only marked INACTIVE. */
    @Transactional
    public void deactivate(Long id) {
        findOrThrow(id).setStatus(ServiceStatus.INACTIVE);
    }

    private LaundryService findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
