package com.stu.edu.vn.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One point of the 7-day revenue chart. Days without sales are returned with 0. */
public record DailyRevenueResponse(
        LocalDate date,
        BigDecimal revenue,
        long orderCount
) {
}
