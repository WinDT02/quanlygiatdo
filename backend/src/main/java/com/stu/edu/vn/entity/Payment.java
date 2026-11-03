package com.stu.edu.vn.entity;

import com.stu.edu.vn.entity.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * One payment attempt (VNPay). An order can have several attempts (failed / abandoned ones + at most one that counts).
 * {@code txnRef} is the vnp_TxnRef we send to VNPay; it is how the callback finds this row.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "txn_ref", nullable = false, unique = true, length = 64)
    private String txnRef;

    /** Amount in VND, copied from the order when the attempt was created. */
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    /** vnp_TransactionNo: VNPay's own transaction number. */
    @Column(name = "gateway_txn_no", length = 50)
    private String gatewayTxnNo;

    /** vnp_ResponseCode ("00" = success). */
    @Column(name = "response_code", length = 10)
    private String responseCode;

    @Column(name = "bank_code", length = 20)
    private String bankCode;

    /** vnp_PayDate as sent by VNPay (yyyyMMddHHmmss). */
    @Column(name = "pay_date", length = 14)
    private String payDate;
}
