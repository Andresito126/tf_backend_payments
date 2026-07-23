import { Injectable } from '@nestjs/common';
import { PostgreSQl } from '../../../../core/database/postgresql.connection';
import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { Payment, PaymentProps } from '../../domain/entities/payment.entity';

@Injectable()
export class PostgresPaymentRepository implements IPaymentRepository {
  constructor(private readonly db: PostgreSQl) {}

  async findByCollectionId(collectionId: string): Promise<Payment | null> {
    const result = await this.db.query(
      'SELECT * FROM payments WHERE collection_id = $1 ORDER BY payment_date DESC LIMIT 1',
      [collectionId],
    );
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findByGatewayOrderId(orderId: string): Promise<Payment | null> {
    const result = await this.db.query(
      'SELECT * FROM payments WHERE gateway_order_id = $1 ORDER BY payment_date DESC LIMIT 1',
      [orderId],
    );
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findPendingPremiumByUserId(userId: string): Promise<Payment | null> {
    const result = await this.db.query(
      `SELECT * FROM payments
       WHERE payer_id = $1 AND purpose = 'premium' AND status = 'pending'
       ORDER BY payment_date DESC LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async save(payment: Payment): Promise<void> {
    await this.db.query(
      `INSERT INTO payments (
        payment_id, collection_id, purpose, payer_id, receiver_id,
        gross_amount, treasureflow_fee, receiver_net_amount,
        payment_method, gateway_order_id, gateway_charge_id, payment_reference,
        status, payment_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        payment.getPaymentId(),
        payment.getCollectionId(),
        payment.getPurpose(),
        payment.getPayerId(),
        payment.getReceiverId(),
        payment.getGrossAmount(),
        payment.getTreasureflowFee(),
        payment.getReceiverNetAmount(),
        payment.getPaymentMethod(),
        payment.getGatewayOrderId(),
        payment.getGatewayChargeId(),
        payment.getPaymentReference(),
        payment.getStatus(),
        payment.getPaymentDate(),
      ],
    );
  }

  async update(payment: Payment): Promise<void> {
    await this.db.query(
      `UPDATE payments SET
        gateway_order_id  = $2,
        gateway_charge_id = $3,
        payment_reference = $4,
        status            = $5
       WHERE payment_id = $1`,
      [
        payment.getPaymentId(),
        payment.getGatewayOrderId(),
        payment.getGatewayChargeId(),
        payment.getPaymentReference(),
        payment.getStatus(),
      ],
    );
  }

  private mapToEntity(row: Record<string, unknown>): Payment {
    const props: PaymentProps = {
      paymentId: row.payment_id as string,
      collectionId: row.collection_id as string | null,
      purpose: (row.purpose as PaymentProps['purpose']) ?? 'collection',
      payerId: row.payer_id as string,
      receiverId: row.receiver_id as string,
      grossAmount: Number(row.gross_amount),
      treasureflowFee: Number(row.treasureflow_fee),
      receiverNetAmount: Number(row.receiver_net_amount),
      paymentMethod: row.payment_method as PaymentProps['paymentMethod'],
      gatewayOrderId: row.gateway_order_id as string | null,
      gatewayChargeId: row.gateway_charge_id as string | null,
      paymentReference: row.payment_reference as string | null,
      status: row.status as PaymentProps['status'],
      paymentDate: row.payment_date as Date,
    };
    return Payment.reconstitute(props);
  }
}
