package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.CreateEmployeeRequest;
import com.stu.edu.vn.dto.EmployeeCreatedResponse;
import com.stu.edu.vn.dto.EmployeeResponse;
import com.stu.edu.vn.entity.enums.UserStatus;
import com.stu.edu.vn.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** ADMIN only (enforced by the /api/admin/** rule in SecurityConfig). */
@RestController
@RequestMapping("/api/admin/employees")
@RequiredArgsConstructor
public class AdminEmployeeController {

    private final EmployeeService employeeService;

    /** GET /api/admin/employees  or  ?status=ACTIVE to list only staff who can take orders. */
    @GetMapping
    public List<EmployeeResponse> list(@RequestParam(required = false) UserStatus status) {
        return employeeService.list(status);
    }

    @PostMapping
    public ResponseEntity<EmployeeCreatedResponse> create(@Valid @RequestBody CreateEmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.create(request));
    }
}
