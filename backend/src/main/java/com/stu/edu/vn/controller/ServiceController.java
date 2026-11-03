package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.ServiceRequest;
import com.stu.edu.vn.dto.ServiceResponse;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.ServiceCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceController {

    private final ServiceCatalogService serviceCatalogService;

    /**
     * Public: ACTIVE services only.
     * An authenticated ADMIN can add ?all=true to also see INACTIVE ones (to re-activate them).
     */
    @GetMapping
    public List<ServiceResponse> list(@RequestParam(defaultValue = "false") boolean all,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        return serviceCatalogService.list(all && isAdmin(principal));
    }

    @GetMapping("/{id}")
    public ServiceResponse get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return serviceCatalogService.getById(id, isAdmin(principal));
    }

    @PostMapping
    public ResponseEntity<ServiceResponse> create(@Valid @RequestBody ServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceCatalogService.create(request));
    }

    @PutMapping("/{id}")
    public ServiceResponse update(@PathVariable Long id, @Valid @RequestBody ServiceRequest request) {
        return serviceCatalogService.update(id, request);
    }

    /** Soft delete -> status INACTIVE. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceCatalogService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    /** principal is null for anonymous requests. */
    private boolean isAdmin(UserPrincipal principal) {
        return principal != null && "ADMIN".equals(principal.getRole());
    }
}
