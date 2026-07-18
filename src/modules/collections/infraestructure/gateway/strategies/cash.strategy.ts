import { BaseConektaStrategy } from './base-conekta.strategy';
import type { CreateChargeInput } from '../../../application/ports/payment-gateway.port';

const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;

/**
 * Pago en efectivo — OXXO Pay (equivalente a cash.py del demo).
 * Genera un voucher con referencia y código de barras que el pagador
 * lleva a cualquier OXXO. Conekta confirma vía webhook cuando se paga.
 */
export class CashPaymentStrategy extends BaseConektaStrategy {
  protected buildPaymentMethod(_input: CreateChargeInput): Record<string, unknown> {
    return {
      type: 'cash',
      expires_at: Math.floor(Date.now() / 1000) + THREE_DAYS_SECONDS,
    };
  }
}
