import type { IPaymentRepository } from '../../../collections/domain/repositories/payment.repository';
import type { IPaymentGateway } from '../../../collections/application/ports/payment-gateway.port';
import type { IPremiumUserRepository } from '../ports/premium-user.repository';
import { ActivatePremiumUseCase } from './activate-premium.use-case';

export interface PremiumStatusResult {
  isPremium: boolean;
  premiumExpiresAt: Date | null;
  pendingPayment: {
    paymentId: string;
    method: string;
    reference: string | null;
    expiresAt: Date | null;
  } | null;
}

/**
 * Estado premium del usuario. Funciona además como polling (calca
 * CheckPaymentStatusUseCase): si hay un payment premium pendiente con orden en
 * Conekta, re-consulta el estado real; 'paid' activa premium, 'expired'/
 * 'declined' lo marca fallido.
 */
export class GetPremiumStatusUseCase {
  constructor(
    private readonly premiumUserRepository: IPremiumUserRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly activatePremiumUseCase: ActivatePremiumUseCase,
  ) {}

  async execute(userId: string): Promise<PremiumStatusResult> {
    let pending = await this.paymentRepository.findPendingPremiumByUserId(userId);

    if (pending?.getGatewayOrderId()) {
      const gateway = await this.paymentGateway.getOrderStatus(
        pending.getGatewayOrderId()!,
        pending.getPaymentMethod(),
      );

      if (gateway.status === 'paid') {
        await this.activatePremiumUseCase.execute(pending);
        pending = null;
      } else if (gateway.status === 'expired' || gateway.status === 'declined') {
        pending.markFailed();
        await this.paymentRepository.update(pending);
        pending = null;
      }
    }

    const status = await this.premiumUserRepository.getStatus(userId);

    const isPremium = Boolean(
      status?.isPremiumFlag &&
        (!status.premiumExpiresAt || status.premiumExpiresAt > new Date()),
    );

    return {
      isPremium,
      premiumExpiresAt: isPremium ? (status?.premiumExpiresAt ?? null) : null,
      pendingPayment: pending
        ? {
            paymentId: pending.getPaymentId(),
            method: pending.getPaymentMethod(),
            reference: pending.getPaymentReference(),
            expiresAt: null,
          }
        : null,
    };
  }
}
