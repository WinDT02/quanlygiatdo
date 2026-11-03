package com.stu.edu.vn.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record DashboardStatsResponse(
        /** Sum of total_amount of COMPLETED orders (all time). */
        BigDecimal totalRevenue,
        long totalOrders,
        /** Always contains all 5 statuses (0 when empty): PENDING, PROCESSING, WASHING, COMPLETED, CANCELLED. */
        Map<String, Long> ordersByStatus,
        long totalCustomers,
        long newCustomersToday,
        long newCustomersLast7Days,
        /** Oldest day first, always 7 entries ending today. Revenue of COMPLETED orders grouped by order date. */
        List<DailyRevenueResponse> revenueLast7Days
) {
}
