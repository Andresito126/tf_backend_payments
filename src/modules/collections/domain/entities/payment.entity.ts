import { roundMoney } from '../../../../core/utils/money.util';

export type PaymentStatus = 'pending' | 'paid_held' | 'released' | 'failed';
export type PaymentMethod = 'card' | 'cash' | 'transfer';

export interface PaymentProps {
  paymentId: string;
  collectionId: string;
  payerId: string;
  receiverId: string;
  grossAmount: number;
  treasureflowFee: number;
  receiverNetAmount: number;
  paymentMethod: PaymentMethod;
  gatewayOrderId: string | null;
  gatewayChargeId: string | null;
  paymentReference: string | null; // referencia OXXO o CLABE SPEI
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
    paymentMethod: PaymentMethod,
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
      paymentMethod,
      gatewayOrderId: null,
      gatewayChargeId: null,
      paymentReference: null,
      status: 'pending',
      paymentDate: new Date(),
    });
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props);
  }

  attachGatewayOrder(orderId: string, chargeId: string | null, reference: string | null): void {
    this.props.gatewayOrderId = orderId;
    this.props.gatewayChargeId = chargeId;
    this.props.paymentReference = reference;
  }

  markPaidHeld(): void {
    this.props.status = 'paid_held';
  }

  markReleased(): void {
    this.props.status = 'released';
  }

  markFailed(): void {
    this.props.status = 'failed';
  }

  isReleased(): boolean {
    return this.props.status === 'released';
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

  getPaymentMethod(): PaymentMethod {
    return this.props.paymentMethod;
  }

  getGatewayOrderId(): string | null {
    return this.props.gatewayOrderId;
  }

  getGatewayChargeId(): string | null {
    return this.props.gatewayChargeId;
  }

  getPaymentReference(): string | null {
    return this.props.paymentReference;
  }

  getStatus(): PaymentStatus {
    return this.props.status;
  }

  getPaymentDate(): Date {
    return this.props.paymentDate;
  }
}
