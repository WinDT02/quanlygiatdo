package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.DailyRevenueResponse;
import com.stu.edu.vn.dto.DashboardStatsResponse;
import com.stu.edu.vn.entity.enums.OrderStatus;
import com.stu.edu.vn.repository.CustomerRepository;
import com.stu.edu.vn.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int DEFAULT_CHART_DAYS = 7;
    private static final int MAX_CHART_DAYS = 92;

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        return getStats(DEFAULT_CHART_DAYS);
    }

    /**
     * @param chartDays length of the revenue series (1..92). The admin dashboard asks for 31 days, which covers
     *                  "today", "last 7 days" and "this month"; the field keeps its old name revenueLast7Days.
     */
    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats(int chartDays) {
        int days = Math.min(Math.max(chartDays, 1), MAX_CHART_DAYS);
        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime chartStart = today.minusDays(days - 1L).atStartOfDay();
        LocalDateTime last7Start = today.minusDays(6).atStartOfDay();

        // revenue: COMPLETED orders only
        BigDecimal totalRevenue = orderRepository.sumTotalAmountByStatus(OrderStatus.COMPLETED);
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        // orders by status (every status present, even with 0)
        Map<String, Long> ordersByStatus = new LinkedHashMap<>();
        for (OrderStatus status : OrderStatus.values()) {
            ordersByStatus.put(status.name(), 0L);
        }
        orderRepository.countGroupedByStatus()
                .forEach(row -> ordersByStatus.put(row.getStatus().name(), row.getTotal()));
        long totalOrders = ordersByStatus.values().stream().mapToLong(Long::longValue).sum();

        return new DashboardStatsResponse(
                totalRevenue,
                totalOrders,
                ordersByStatus,
                customerRepository.count(),
                customerRepository.countByCreatedAtGreaterThanEqual(startOfToday),
                customerRepository.countByCreatedAtGreaterThanEqual(last7Start),
                revenueLastDays(today, chartStart, days));
    }

    /** Revenue per day for the last 7 days (today included), zero-filled so the chart has no gaps. */
    private List<DailyRevenueResponse> revenueLastDays(LocalDate today, LocalDateTime chartStart, int days) {
        Map<LocalDate, BigDecimal> revenueByDay = new LinkedHashMap<>();
        Map<LocalDate, Long> countByDay = new LinkedHashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            revenueByDay.put(day, BigDecimal.ZERO);
            countByDay.put(day, 0L);
        }

        orderRepository.findRevenueRows(OrderStatus.COMPLETED, chartStart).forEach(row -> {
            LocalDate day = row.getOrderedAt().toLocalDate();
            if (revenueByDay.containsKey(day)) {          // ignores orders dated in the future
                revenueByDay.merge(day, row.getTotalAmount(), BigDecimal::add);
                countByDay.merge(day, 1L, Long::sum);
            }
        });

        List<DailyRevenueResponse> result = new ArrayList<>();
        revenueByDay.forEach((day, revenue) -> result.add(new DailyRevenueResponse(day, revenue, countByDay.get(day))));
        return result;
    }
}
