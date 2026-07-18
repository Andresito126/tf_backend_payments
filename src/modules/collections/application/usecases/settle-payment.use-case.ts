import type { Payment } from '../../domain/entities/payment.entity';
import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import type { IEventPublisher } from '../../../common/ports/event-publisher.port';
import type { ICollectionMessageMaker } from '../ports/collection-message-maker.port';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';

/**
 * Liberación del pago: Conekta confirmó que el dinero fue pagado.
 * pending → paid_held (dinero en custodia) → released (liberado al ciudadano),
 * collection → completed, evento payments.settle a main y push al ciudadano.
 *
 * Idempotente: si el pago ya está released no hace nada.
 * Lo invocan: pago con tarjeta (síncrono), polling de estado y webhook.
 */
export class SettlePaymentUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly offerReadPort: IOfferReadPort,
    private readonly eventPublisher: IEventPublisher,
    private readonly messageMaker: ICollectionMessageMaker,
  ) {}

  async execute(payment: Payment): Promise<void> {
    if (payment.isReleased()) return;

    const collection = await this.collectionRepository.findById(payment.getCollectionId());
    if (!collection) throw new CollectionNotFoundException();

    payment.markPaidHeld();
    payment.markReleased();
    collection.complete();

    await this.paymentRepository.update(payment);
    await this.collectionRepository.update(collection);

    const offer = await this.offerReadPort.getOfferPricing(collection.getOfferId());

    try {
      await this.eventPublisher.publish('payments.exchange', 'payments.settle', {
        collectionId: collection.getCollectionId(),
        offerId: collection.getOfferId(),
        wastePublicationId: offer?.wastePublicationId ?? null,
        paymentId: payment.getPaymentId(),
        netAmount: payment.getReceiverNetAmount(),
        occurredAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[SettlePayment] Evento settle fallido:', err instanceof Error ? err.message : String(err));
    }

    try {
      const msg = await this.messageMaker.makePaymentReceivedMessage(
        collection.getCollectionId(),
        payment.getReceiverId(),
        payment.getReceiverNetAmount(),
      );
      await this.eventPublisher.publish('notifications', 'notification.push', msg);
    } catch (err) {
      console.error('[SettlePayment] Notificación fallida:', err instanceof Error ? err.message : String(err));
    }
  }

  async executeByGatewayOrderId(orderId: string): Promise<void> {
    const payment = await this.paymentRepository.findByGatewayOrderId(orderId);
    if (!payment) {
      console.warn(`[SettlePayment] Webhook con orden desconocida: ${orderId}`);
      return;
    }
    await this.execute(payment);
  }
}
