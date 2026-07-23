import type { Payment } from '../../../collections/domain/entities/payment.entity';
import type { IPaymentRepository } from '../../../collections/domain/repositories/payment.repository';
import type { IEventPublisher } from '../../../common/ports/event-publisher.port';
import type { IPremiumUserRepository } from '../ports/premium-user.repository';
import type { IPremiumMessageMaker } from '../ports/premium-message-maker.port';

/**
 * Activación del plan premium: Conekta confirmó que el dinero fue pagado.
 * Extiende `users.premium_expires_at` 30 días (sumando si ya estaba vigente),
 * marca el payment pending → paid_held → released y notifica por push.
 *
 * Idempotente: si el pago ya está released no hace nada.
 * Lo invocan: pago con tarjeta (síncrono), polling de estado y
 * ProcessGatewayEventUseCase (webhook verificado) cuando purpose='premium'.
 */
export class ActivatePremiumUseCase {
  constructor(
    private readonly premiumUserRepository: IPremiumUserRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly messageMaker: IPremiumMessageMaker,
  ) {}

  async execute(payment: Payment): Promise<void> {
    if (payment.isReleased()) return;

    const expiresAt = await this.premiumUserRepository.activatePremium(payment.getPayerId());

    payment.markPaidHeld();
    payment.markReleased();
    await this.paymentRepository.update(payment);

    try {
      const msg = await this.messageMaker.makePremiumActivatedMessage(
        payment.getPayerId(),
        expiresAt,
      );
      await this.eventPublisher.publish('notifications', 'notification.push', msg);
    } catch (err) {
      console.error(
        '[ActivatePremium] Notificación fallida:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
