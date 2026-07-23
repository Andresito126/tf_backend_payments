import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

// Controllers
import { PremiumController } from './infraestructure/controllers/premium.controller';

// Use cases
import { ActivatePremiumUseCase } from './application/usecases/activate-premium.use-case';
import { CreatePremiumPaymentUseCase } from './application/usecases/create-premium-payment.use-case';
import { GetPremiumStatusUseCase } from './application/usecases/get-premium-status.use-case';

// Adapters (reutiliza los de collections para pagos/cliente/pasarela)
import { PostgresPaymentRepository } from '../collections/infraestructure/adapters/postgres-payment.repository';
import { PostgresUserAccountAdapter } from '../collections/infraestructure/adapters/postgres-user-account.adapter';
import { ConektaGatewayAdapter } from '../collections/infraestructure/gateway/conekta-gateway.adapter';
import { PostgresPremiumUserRepository } from './infraestructure/adapters/postgres-premium-user.repository';
import { PremiumMessageMakerAdapter } from './infraestructure/adapters/premium-message-maker.adapter';

// Ports (tipos para los factories)
import type { IPaymentRepository } from '../collections/domain/repositories/payment.repository';
import type { IUserAccountPort } from '../collections/application/ports/user-account.port';
import type { IPaymentGateway } from '../collections/application/ports/payment-gateway.port';
import type { IPremiumUserRepository } from './application/ports/premium-user.repository';
import type { IPremiumMessageMaker } from './application/ports/premium-message-maker.port';
import type { IIdGenerator } from '../common/ports/id-generator.port';
import type { IEventPublisher } from '../common/ports/event-publisher.port';
import type { IFieldEncryptor } from '../common/ports/field-encryptor.port';
import { PostgreSQl } from '../../core/database/postgresql.connection';

@Module({
  imports: [AuthModule],
  controllers: [PremiumController],
  providers: [
    // ── Adapters (string tokens) ──────────────────────────────────────────────
    { provide: 'IPaymentRepository', useClass: PostgresPaymentRepository },
    { provide: 'IPaymentGateway', useClass: ConektaGatewayAdapter },
    { provide: 'IPremiumUserRepository', useClass: PostgresPremiumUserRepository },
    {
      provide: 'IUserAccountPort',
      useFactory: (db: PostgreSQl, encryptor: IFieldEncryptor) =>
        new PostgresUserAccountAdapter(db, encryptor),
      inject: [PostgreSQl, 'IFieldEncryptor'],
    },
    {
      provide: 'IPremiumMessageMaker',
      useFactory: (db: PostgreSQl, encryptor: IFieldEncryptor) =>
        new PremiumMessageMakerAdapter(db, encryptor),
      inject: [PostgreSQl, 'IFieldEncryptor'],
    },

    // ── Use cases ─────────────────────────────────────────────────────────────
    {
      provide: ActivatePremiumUseCase,
      useFactory: (
        premiumUserRepo: IPremiumUserRepository,
        paymentRepo: IPaymentRepository,
        eventPublisher: IEventPublisher,
        messageMaker: IPremiumMessageMaker,
      ) => new ActivatePremiumUseCase(premiumUserRepo, paymentRepo, eventPublisher, messageMaker),
      inject: ['IPremiumUserRepository', 'IPaymentRepository', 'IEventPublisher', 'IPremiumMessageMaker'],
    },
    {
      provide: CreatePremiumPaymentUseCase,
      useFactory: (
        paymentRepo: IPaymentRepository,
        userAccountPort: IUserAccountPort,
        paymentGateway: IPaymentGateway,
        idGenerator: IIdGenerator,
        activatePremiumUseCase: ActivatePremiumUseCase,
        configService: ConfigService,
      ) =>
        new CreatePremiumPaymentUseCase(
          paymentRepo,
          userAccountPort,
          paymentGateway,
          idGenerator,
          activatePremiumUseCase,
          configService.get<string>('CONEKTA.CURRENCY') ?? 'MXN',
          Number(configService.get<number>('CONEKTA.PREMIUM_PRICE_MXN') ?? 16),
        ),
      inject: [
        'IPaymentRepository',
        'IUserAccountPort',
        'IPaymentGateway',
        'IIdGenerator',
        ActivatePremiumUseCase,
        ConfigService,
      ],
    },
    {
      provide: GetPremiumStatusUseCase,
      useFactory: (
        premiumUserRepo: IPremiumUserRepository,
        paymentRepo: IPaymentRepository,
        paymentGateway: IPaymentGateway,
        activatePremiumUseCase: ActivatePremiumUseCase,
      ) => new GetPremiumStatusUseCase(premiumUserRepo, paymentRepo, paymentGateway, activatePremiumUseCase),
      inject: ['IPremiumUserRepository', 'IPaymentRepository', 'IPaymentGateway', ActivatePremiumUseCase],
    },
  ],
  exports: [ActivatePremiumUseCase],
})
export class PremiumModule {}
