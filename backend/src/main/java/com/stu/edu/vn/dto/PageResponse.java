package com.stu.edu.vn.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** Stable JSON shape for paginated results (do not serialize Spring's PageImpl directly). */
public record PageResponse<T>(
        List<T> content,
        int page,             // 0-based
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast());
    }

    public static <T> PageResponse<T> empty(int page, int size) {
        return new PageResponse<>(List.of(), page, size, 0, 0, true, true);
    }
}
