import type { Payment } from '../entities/payment.entity';

export interface IPaymentRepository {
  findByCollectionId(collectionId: string): Promise<Payment | null>;
  findByGatewayOrderId(orderId: string): Promise<Payment | null>;
  findPendingPremiumByUserId(userId: string): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
  update(payment: Payment): Promise<void>;
}
