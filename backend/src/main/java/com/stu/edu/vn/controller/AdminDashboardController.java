package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.DashboardStatsResponse;
import com.stu.edu.vn.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** ADMIN only: everything under /api/admin/** is restricted in SecurityConfig. */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public DashboardStatsResponse stats(@RequestParam(defaultValue = "7") int days) {
        return dashboardService.getStats(days);
    }
}
