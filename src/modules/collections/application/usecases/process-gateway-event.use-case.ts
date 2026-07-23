import type { IPaymentRepository } from '../../domain/repositories/payment.repository';
import type { IPaymentGateway } from '../ports/payment-gateway.port';
import { SettlePaymentUseCase } from './settle-payment.use-case';

/**
 * Procesa un evento del webhook de Conekta SIN confiar en el payload:
 * toma solo el orderId, busca el pago en BD y RE-CONSULTA el estado real de la
 * orden a la API de Conekta (con la llave del método correspondiente — esquema
 * mixto live/test). Solo libera si Conekta confirma 'paid'.
 *
 * Así, un `order.paid` falso POSTeado por un atacante no libera nada: la
 * re-consulta devolvería 'pending_payment'.
 *
 * También cubre expiración/rechazo (order.expired, charge.declined): el estado
 * real 'expired'/'declined' marca el pago como failed, igual que el polling.
 */
export class ProcessGatewayEventUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly settlePaymentUseCase: SettlePaymentUseCase,
  ) {}

  async execute(orderId: string): Promise<void> {
    const payment = await this.paymentRepository.findByGatewayOrderId(orderId);
    if (!payment) {
      console.warn(`[ProcessGatewayEvent] Webhook con orden desconocida: ${orderId}`);
      return;
    }

    // Idempotente: ya liberado, nada que hacer (ahorra el GET a Conekta).
    if (payment.isReleased()) return;

    const gateway = await this.paymentGateway.getOrderStatus(
      orderId,
      payment.getPaymentMethod(),
    );

    if (gateway.status === 'paid') {
      await this.settlePaymentUseCase.execute(payment);
    } else if (gateway.status === 'expired' || gateway.status === 'declined') {
      payment.markFailed();
      await this.paymentRepository.update(payment);
    }
    // pending_payment / unknown → no hacer nada (el polling sigue de respaldo).
  }
}
