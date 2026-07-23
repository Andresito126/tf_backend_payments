import { Payment, PaymentMethod } from '../../../collections/domain/entities/payment.entity';
import type { IPaymentRepository } from '../../../collections/domain/repositories/payment.repository';
import type { IUserAccountPort } from '../../../collections/application/ports/user-account.port';
import type { IPaymentGateway } from '../../../collections/application/ports/payment-gateway.port';
import type { IIdGenerator } from '../../../common/ports/id-generator.port';
import { ActivatePremiumUseCase } from './activate-premium.use-case';
import { CollectionOwnershipException } from '../../../collections/domain/exceptions/collection-ownership.exception';
import { PaymentCaptureFailedException } from '../../../collections/domain/exceptions/payment-capture-failed.exception';

export interface CreatePremiumPaymentInput {
  userId: string;
  method: PaymentMethod;
  tokenId?: string;
}

export interface CreatePremiumPaymentResult {
  paymentId: string;
  status: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  barcodeUrl: string | null;
  expiresAt: Date | null;
}

export class CreatePremiumPaymentUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly userAccountPort: IUserAccountPort,
    private readonly paymentGateway: IPaymentGateway,
    private readonly idGenerator: IIdGenerator,
    private readonly activatePremiumUseCase: ActivatePremiumUseCase,
    private readonly currency: string,
    private readonly premiumPrice: number,
  ) {}

  async execute(input: CreatePremiumPaymentInput): Promise<CreatePremiumPaymentResult> {
    // Si ya hay un pago premium pendiente con voucher vigente (OXXO/SPEI) y el
    // mismo método, lo devolvemos en lugar de generar otro cargo.
    const existing = await this.paymentRepository.findPendingPremiumByUserId(input.userId);
    if (
      existing &&
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

    const customer = await this.userAccountPort.getCustomerInfo(input.userId);
    if (!customer) throw new CollectionOwnershipException();

    const payment = Payment.createPendingPremium(
      this.idGenerator.generate(),
      input.userId,
      this.premiumPrice,
      input.method,
    );

    let result;
    try {
      result = await this.paymentGateway.createCharge({
        method: input.method,
        amountCents: Math.round(this.premiumPrice * 100),
        currency: this.currency,
        description: 'TreasureFlow — Plan Premium (30 días)',
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
      // Tarjeta: el pago se confirma al instante → activar de una vez
      await this.activatePremiumUseCase.execute(payment);
    }

    return {
      paymentId: payment.getPaymentId(),
      status: payment.getStatus(),
      method: input.method,
      amount: this.premiumPrice,
      reference: result.reference,
      barcodeUrl: result.barcodeUrl,
      expiresAt: result.expiresAt,
    };
  }
}
