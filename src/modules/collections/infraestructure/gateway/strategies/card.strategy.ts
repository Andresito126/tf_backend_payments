import { BaseConektaStrategy } from './base-conekta.strategy';
import { PaymentCaptureFailedException } from '../../../domain/exceptions/payment-capture-failed.exception';
import type { CreateChargeInput } from '../../../application/ports/payment-gateway.port';

/**
 * Pago con tarjeta (equivalente a card.py del demo).
 * Requiere un token_id generado por el frontend con Conekta.js
 * (en sandbox se puede usar 'tok_test_visa_4242').
 */
export class CardPaymentStrategy extends BaseConektaStrategy {
  protected buildPaymentMethod(input: CreateChargeInput): Record<string, unknown> {
    if (!input.tokenId) {
      throw new PaymentCaptureFailedException(
        "El parámetro 'tokenId' es requerido para pagos con tarjeta.",
      );
    }
    return {
      type: 'card',
      token_id: input.tokenId,
    };
  }
}
