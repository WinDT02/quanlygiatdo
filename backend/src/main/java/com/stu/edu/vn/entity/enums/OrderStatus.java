package com.stu.edu.vn.entity.enums;

/**
 * Order lifecycle:
 * <pre>
 * PENDING -> PROCESSING -> WASHING -> COMPLETED
 * PENDING / PROCESSING / WASHING -> CANCELLED
 * </pre>
 * PROCESSING may also go straight to COMPLETED (same as the legacy system).
 * COMPLETED and CANCELLED are terminal states.
 */
public enum OrderStatus {
    PENDING,
    PROCESSING,
    WASHING,
    COMPLETED,
    CANCELLED;

    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case PENDING -> next == PROCESSING || next == CANCELLED;
            case PROCESSING -> next == WASHING || next == COMPLETED || next == CANCELLED;
            case WASHING -> next == COMPLETED || next == CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}
