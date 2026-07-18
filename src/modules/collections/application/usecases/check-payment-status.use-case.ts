import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import type { IPaymentGateway } from '../ports/payment-gateway.port';
import { SettlePaymentUseCase } from './settle-payment.use-case';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';
import { CollectionOwnershipException } from '../../domain/exceptions/collection-ownership.exception';
import { PaymentOrderNotFoundException } from '../../domain/exceptions/payment-order-not-found.exception';

export interface CheckPaymentStatusInput {
  collectionId: string;
  establishmentId: string;
}

export interface CheckPaymentStatusResult {
  paymentStatus: string;
  gatewayStatus: string;
  collectionStatus: string;
}

/**
 * Polling del estado del pago contra Conekta (para OXXO/SPEI sin webhook público).
 * Si Conekta reporta la orden pagada, ejecuta la liberación.
 */
export class CheckPaymentStatusUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly offerReadPort: IOfferReadPort,
    private readonly paymentGateway: IPaymentGateway,
    private readonly settlePaymentUseCase: SettlePaymentUseCase,
  ) {}

  async execute(input: CheckPaymentStatusInput): Promise<CheckPaymentStatusResult> {
    const collection = await this.collectionRepository.findById(input.collectionId);
    if (!collection) throw new CollectionNotFoundException();

    const offer = await this.offerReadPort.getOfferPricing(collection.getOfferId());
    if (!offer || offer.establishmentId !== input.establishmentId) {
      throw new CollectionOwnershipException();
    }

    const payment = await this.paymentRepository.findByCollectionId(input.collectionId);
    if (!payment?.getGatewayOrderId()) throw new PaymentOrderNotFoundException();

    if (payment.isReleased()) {
      return {
        paymentStatus: payment.getStatus(),
        gatewayStatus: 'paid',
        collectionStatus: collection.getStatus(),
      };
    }

    const gateway = await this.paymentGateway.getOrderStatus(payment.getGatewayOrderId()!);

    if (gateway.status === 'paid') {
      await this.settlePaymentUseCase.execute(payment);
    } else if (gateway.status === 'expired' || gateway.status === 'declined') {
      payment.markFailed();
      await this.paymentRepository.update(payment);
    }

    const refreshed = await this.collectionRepository.findById(input.collectionId);

    return {
      paymentStatus: payment.getStatus(),
      gatewayStatus: gateway.status,
      collectionStatus: refreshed?.getStatus() ?? collection.getStatus(),
    };
  }
}
