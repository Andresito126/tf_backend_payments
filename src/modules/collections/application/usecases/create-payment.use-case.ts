import { Payment, PaymentMethod } from '../../domain/entities/payment.entity';
import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import type { IUserAccountPort } from '../ports/user-account.port';
import type { IPaymentGateway } from '../ports/payment-gateway.port';
import type { IIdGenerator } from '../../../common/ports/id-generator.port';
import { SettlePaymentUseCase } from './settle-payment.use-case';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';
import { CollectionOwnershipException } from '../../domain/exceptions/collection-ownership.exception';
import { InvalidCollectionTransitionException } from '../../domain/exceptions/invalid-collection-transition.exception';
import { PaymentCaptureFailedException } from '../../domain/exceptions/payment-capture-failed.exception';

export interface CreatePaymentInput {
  collectionId: string;
  establishmentId: string;
  method: PaymentMethod;
  tokenId?: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  status: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null; // referencia OXXO o CLABE SPEI
  barcodeUrl: string | null;
  expiresAt: Date | null;
}

export class CreatePaymentUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly offerReadPort: IOfferReadPort,
    private readonly userAccountPort: IUserAccountPort,
    private readonly paymentGateway: IPaymentGateway,
    private readonly idGenerator: IIdGenerator,
    private readonly settlePaymentUseCase: SettlePaymentUseCase,
    private readonly currency: string,
    private readonly feeRate: number,
  ) {}

  async execute(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const collection = await this.collectionRepository.findById(input.collectionId);
    if (!collection) throw new CollectionNotFoundException();

    const offer = await this.offerReadPort.getOfferPricing(collection.getOfferId());
    if (!offer || offer.establishmentId !== input.establishmentId) {
      throw new CollectionOwnershipException();
    }

    if (collection.getStatus() !== 'pending_payment') {
      throw new InvalidCollectionTransitionException(collection.getStatus(), 'crear pago');
    }

    // Si ya hay un pago pendiente con voucher vigente (OXXO/SPEI), lo devolvemos
    // en lugar de generar otro cargo.
    const existing = await this.paymentRepository.findByCollectionId(input.collectionId);
    if (
      existing &&
      existing.getStatus() === 'pending' &&
      existing.getGatewayOrderId() &&
      existing.getPaymentMethod() === input.method &&
      input.method !== 'card'
    ) {
      return {
        paymentId: existing.getPaymentId(),
        status: 'pending',
        method: existing.getPaymentMethod(),
        amount: existing.getGrossAmount(),
        reference: existing.getPaymentReference(),
        barcodeUrl: null,
        expiresAt: null,
      };
    }

    const customer = await this.userAccountPort.getCustomerInfo(input.establishmentId);
    if (!customer) throw new CollectionOwnershipException();

    const grossAmount = collection.getFinalAmount()!;

    const payment = Payment.createPending(
      this.idGenerator.generate(),
      input.collectionId,
      input.establishmentId,
      offer.citizenId,
      grossAmount,
      this.feeRate,
      input.method,
    );

    let result;
    try {
      result = await this.paymentGateway.createCharge({
        method: input.method,
        amountCents: Math.round(grossAmount * 100),
        currency: this.currency,
        description: `TreasureFlow — recolección de residuos (${offer.unit})`,
        customer,
        tokenId: input.tokenId,
      });
    } catch (err) {
      payment.markFailed();
      await this.paymentRepository.save(payment);
      throw err;
    }

    payment.attachGatewayOrder(result.orderId, result.chargeId, result.reference);

    if (result.status === 'failed') {
      payment.markFailed();
      await this.paymentRepository.save(payment);
      throw new PaymentCaptureFailedException('El cargo fue rechazado por la pasarela.');
    }

    await this.paymentRepository.save(payment);

    if (result.status === 'paid') {
      // Tarjeta: el pago se confirma al instante → liberar de una vez
      await this.settlePaymentUseCase.execute(payment);
    }

    return {
      paymentId: payment.getPaymentId(),
      status: payment.getStatus(),
      method: input.method,
      amount: grossAmount,
      reference: result.reference,
      barcodeUrl: result.barcodeUrl,
      expiresAt: result.expiresAt,
    };
  }
}
