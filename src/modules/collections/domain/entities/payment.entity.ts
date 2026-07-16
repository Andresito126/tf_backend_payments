import { roundMoney } from '../../../../core/utils/money.util';

export type PaymentStatus = 'pending' | 'released' | 'failed';

export interface PaymentProps {
  paymentId: string;
  collectionId: string;
  payerId: string;
  receiverId: string;
  grossAmount: number;
  treasureflowFee: number;
  receiverNetAmount: number;
  paypalTransactionId: string | null;
  status: PaymentStatus;
  paymentDate: Date;
}

export class Payment {
  private constructor(private readonly props: PaymentProps) {}

  static createPending(
    paymentId: string,
    collectionId: string,
    payerId: string,
    receiverId: string,
    grossAmount: number,
    feeRate: number,
  ): Payment {
    const treasureflowFee = roundMoney(grossAmount * feeRate);
    return new Payment({
      paymentId,
      collectionId,
      payerId,
      receiverId,
      grossAmount: roundMoney(grossAmount),
      treasureflowFee,
      receiverNetAmount: roundMoney(grossAmount - treasureflowFee),
      paypalTransactionId: null,
      status: 'pending',
      paymentDate: new Date(),
    });
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props);
  }

  attachPaypalOrder(orderId: string): void {
    this.props.paypalTransactionId = orderId;
  }

  markReleased(paypalCaptureId: string): void {
    this.props.status = 'released';
    this.props.paypalTransactionId = paypalCaptureId;
  }

  markFailed(): void {
    this.props.status = 'failed';
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  getPaymentId(): string {
    return this.props.paymentId;
  }

  getCollectionId(): string {
    return this.props.collectionId;
  }

  getPayerId(): string {
    return this.props.payerId;
  }

  getReceiverId(): string {
    return this.props.receiverId;
  }

  getGrossAmount(): number {
    return this.props.grossAmount;
  }

  getTreasureflowFee(): number {
    return this.props.treasureflowFee;
  }

  getReceiverNetAmount(): number {
    return this.props.receiverNetAmount;
  }

  getPaypalTransactionId(): string | null {
    return this.props.paypalTransactionId;
  }

  getStatus(): PaymentStatus {
    return this.props.status;
  }

  getPaymentDate(): Date {
    return this.props.paymentDate;
  }
}
