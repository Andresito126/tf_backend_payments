import { BaseConektaStrategy } from './base-conekta.strategy';
import type { CreateChargeInput } from '../../../application/ports/payment-gateway.port';

const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;

/**
 * Pago por transferencia interbancaria SPEI (equivalente a transfer.py del demo).
 * Genera una CLABE única a la cual el pagador transfiere desde su banco.
 * Conekta confirma vía webhook cuando llega la transferencia.
 */
export class TransferPaymentStrategy extends BaseConektaStrategy {
  protected buildPaymentMethod(_input: CreateChargeInput): Record<string, unknown> {
    return {
      type: 'spei',
      expires_at: Math.floor(Date.now() / 1000) + THREE_DAYS_SECONDS,
    };
  }
}
