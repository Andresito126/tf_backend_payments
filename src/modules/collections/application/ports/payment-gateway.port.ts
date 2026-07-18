import type { PaymentMethod } from '../../domain/entities/payment.entity';

export interface GatewayCustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface CreateChargeInput {
  method: PaymentMethod;
  amountCents: number; // Conekta trabaja en centavos (int)
  currency: string;
  description: string;
  customer: GatewayCustomerInfo;
  tokenId?: string; // requerido solo para method 'card'
}

export interface GatewayChargeResult {
  orderId: string;
  chargeId: string | null;
  status: 'paid' | 'pending_payment' | 'failed';
  reference: string | null; // referencia OXXO o CLABE SPEI
  barcodeUrl: string | null; // solo OXXO
  expiresAt: Date | null; // vencimiento del voucher OXXO/SPEI
}

export interface GatewayOrderStatus {
  status: 'paid' | 'pending_payment' | 'expired' | 'declined' | 'unknown';
  chargeId: string | null;
}

export interface IPaymentGateway {
  createCharge(input: CreateChargeInput): Promise<GatewayChargeResult>;
  getOrderStatus(orderId: string): Promise<GatewayOrderStatus>;
}
