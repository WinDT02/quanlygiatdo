package com.stu.edu.vn.service;

/**
 * Turns the free-text search box into filters.
 * <ul>
 *   <li>up to 7 digits  -> order id (so "15", "#DH015" and "DH-15" all find order 15)</li>
 *   <li>8 digits or more -> phone number (contains match); a +84 / 84 country code is turned into a leading 0</li>
 *   <li>text without any digit -> customer name (case-insensitive, contains match)</li>
 * </ul>
 */
public record OrderSearchCriteria(Long orderId, String phone, String name, boolean matchesNothing) {

    private static final int MAX_ORDER_ID_DIGITS = 7;

    public static OrderSearchCriteria parse(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return new OrderSearchCriteria(null, null, null, false);
        }
        String digits = keyword.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            String name = keyword.replaceAll("[%_]", "").trim().toLowerCase();   // % and _ are LIKE wildcards
            return name.isEmpty()
                    ? new OrderSearchCriteria(null, null, null, true)
                    : new OrderSearchCriteria(null, null, name, false);
        }
        if (digits.length() <= MAX_ORDER_ID_DIGITS) {
            return new OrderSearchCriteria(Long.parseLong(digits), null, null, false);
        }
        if (digits.startsWith("84") && digits.length() >= 11) {
            digits = "0" + digits.substring(2);     // +84 912 345 678 -> 0912345678
        }
        return new OrderSearchCriteria(null, digits, null, false);
    }
}
