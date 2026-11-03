package com.stu.edu.vn.entity.enums;

/** Outcome of one payment attempt at the gateway. */
public enum PaymentStatus {
    PENDING,    // URL created, waiting for the gateway result
    SUCCESS,
    FAILED
}
