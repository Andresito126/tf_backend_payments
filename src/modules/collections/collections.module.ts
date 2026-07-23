import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

// Controllers
import { CollectionsController } from './infraestructure/controllers/collections.controller';
import { WebhooksController } from './infraestructure/controllers/webhooks.controller';

// Use cases
import { CreateCollectionFromOfferUseCase } from './application/usecases/create-collection-from-offer.use-case';
import { RegisterWeighingUseCase } from './application/usecases/register-weighing.use-case';
import { ConfirmAmountUseCase } from './application/usecases/confirm-amount.use-case';
import { CreatePaymentUseCase } from './application/usecases/create-payment.use-case';
import { SettlePaymentUseCase } from './application/usecases/settle-payment.use-case';
import { ProcessGatewayEventUseCase } from './application/usecases/process-gateway-event.use-case';
import { CheckPaymentStatusUseCase } from './application/usecases/check-payment-status.use-case';
import { CancelCollectionUseCase } from './application/usecases/cancel-collection.use-case';
import { GetCollectionsUseCase } from './application/usecases/get-collections.use-case';
import { GetCollectionDetailUseCase } from './application/usecases/get-collection-detail.use-case';
import { GetCollectionByOfferUseCase } from './application/usecases/get-collection-by-offer.use-case';

// Adapters
import { PostgresCollectionRepository } from './infraestructure/adapters/postgres-collection.repository';
import { PostgresPaymentRepository } from './infraestructure/adapters/postgres-payment.repository';
import { PostgresOfferReadAdapter } from './infraestructure/adapters/postgres-offer-read.adapter';
import { PostgresUserAccountAdapter } from './infraestructure/adapters/postgres-user-account.adapter';
import { ConektaGatewayAdapter } from './infraestructure/gateway/conekta-gateway.adapter';
import { CollectionMessageMakerAdapter } from './infraestructure/adapters/collection-message-maker.adapter';

// Consumer
import { PaymentExecuteConsumer } from './infraestructure/consumers/payment-execute.consumer';

// Ports (tipos para los factories)
import type { ICollectionRepository } from './domain/repositories/collection.repository';
import type { IPaymentRepository } from './domain/repositories/payment.repository';
import type { IOfferReadPort } from './application/ports/offer-read.port';
import type { IUserAccountPort } from './application/ports/user-account.port';
import type { IPaymentGateway } from './application/ports/payment-gateway.port';
import type { ICollectionMessageMaker } from './application/ports/collection-message-maker.port';
import type { IIdGenerator } from '../common/ports/id-generator.port';
import type { IEventPublisher } from '../common/ports/event-publisher.port';
import type { IFieldEncryptor } from '../common/ports/field-encryptor.port';
import { PostgreSQl } from '../../core/database/postgresql.connection';

@Module({
  imports: [AuthModule],
  controllers: [CollectionsController, WebhooksController],
  providers: [
    // ── Adapters (string tokens) ──────────────────────────────────────────────
    { provide: 'ICollectionRepository', useClass: PostgresCollectionRepository },
    { provide: 'IPaymentRepository', useClass: PostgresPaymentRepository },
    {
      provide: 'IOfferReadPort',
      useFactory: (db: PostgreSQl, encryptor: IFieldEncryptor) =>
        new PostgresOfferReadAdapter(db, encryptor),
      inject: [PostgreSQl, 'IFieldEncryptor'],
    },
    { provide: 'IPaymentGateway', useClass: ConektaGatewayAdapter },
    {
      provide: 'IUserAccountPort',
      useFactory: (db: PostgreSQl, encryptor: IFieldEncryptor) =>
        new PostgresUserAccountAdapter(db, encryptor),
      inject: [PostgreSQl, 'IFieldEncryptor'],
    },
    {
      provide: 'ICollectionMessageMaker',
      useFactory: (db: PostgreSQl, encryptor: IFieldEncryptor) =>
        new CollectionMessageMakerAdapter(db, encryptor),
      inject: [PostgreSQl, 'IFieldEncryptor'],
    },

    // ── Use cases ─────────────────────────────────────────────────────────────
    {
      provide: CreateCollectionFromOfferUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        offerReadPort: IOfferReadPort,
        idGenerator: IIdGenerator,
        eventPublisher: IEventPublisher,
        messageMaker: ICollectionMessageMaker,
      ) => new CreateCollectionFromOfferUseCase(collectionRepo, offerReadPort, idGenerator, eventPublisher, messageMaker),
      inject: ['ICollectionRepository', 'IOfferReadPort', 'IIdGenerator', 'IEventPublisher', 'ICollectionMessageMaker'],
    },
    {
      provide: RegisterWeighingUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        offerReadPort: IOfferReadPort,
        eventPublisher: IEventPublisher,
        messageMaker: ICollectionMessageMaker,
      ) => new RegisterWeighingUseCase(collectionRepo, offerReadPort, eventPublisher, messageMaker),
      inject: ['ICollectionRepository', 'IOfferReadPort', 'IEventPublisher', 'ICollectionMessageMaker'],
    },
    {
      provide: ConfirmAmountUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        offerReadPort: IOfferReadPort,
        eventPublisher: IEventPublisher,
        messageMaker: ICollectionMessageMaker,
      ) => new ConfirmAmountUseCase(collectionRepo, offerReadPort, eventPublisher, messageMaker),
      inject: ['ICollectionRepository', 'IOfferReadPort', 'IEventPublisher', 'ICollectionMessageMaker'],
    },
    {
      provide: SettlePaymentUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        paymentRepo: IPaymentRepository,
        offerReadPort: IOfferReadPort,
        eventPublisher: IEventPublisher,
        messageMaker: ICollectionMessageMaker,
      ) => new SettlePaymentUseCase(collectionRepo, paymentRepo, offerReadPort, eventPublisher, messageMaker),
      inject: ['ICollectionRepository', 'IPaymentRepository', 'IOfferReadPort', 'IEventPublisher', 'ICollectionMessageMaker'],
    },
    {
      provide: CreatePaymentUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        paymentRepo: IPaymentRepository,
        offerReadPort: IOfferReadPort,
        userAccountPort: IUserAccountPort,
        paymentGateway: IPaymentGateway,
        idGenerator: IIdGenerator,
        settlePaymentUseCase: SettlePaymentUseCase,
        configService: ConfigService,
      ) =>
        new CreatePaymentUseCase(
          collectionRepo,
          paymentRepo,
          offerReadPort,
          userAccountPort,
          paymentGateway,
          idGenerator,
          settlePaymentUseCase,
          configService.get<string>('CONEKTA.CURRENCY') ?? 'MXN',
          Number(configService.get<number>('CONEKTA.FEE_RATE') ?? 0.05),
        ),
      inject: [
        'ICollectionRepository',
        'IPaymentRepository',
        'IOfferReadPort',
        'IUserAccountPort',
        'IPaymentGateway',
        'IIdGenerator',
        SettlePaymentUseCase,
        ConfigService,
      ],
    },
    {
      provide: ProcessGatewayEventUseCase,
      useFactory: (
        paymentRepo: IPaymentRepository,
        paymentGateway: IPaymentGateway,
        settlePaymentUseCase: SettlePaymentUseCase,
      ) => new ProcessGatewayEventUseCase(paymentRepo, paymentGateway, settlePaymentUseCase),
      inject: ['IPaymentRepository', 'IPaymentGateway', SettlePaymentUseCase],
    },
    {
      provide: CheckPaymentStatusUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        paymentRepo: IPaymentRepository,
        offerReadPort: IOfferReadPort,
        paymentGateway: IPaymentGateway,
        settlePaymentUseCase: SettlePaymentUseCase,
      ) => new CheckPaymentStatusUseCase(collectionRepo, paymentRepo, offerReadPort, paymentGateway, settlePaymentUseCase),
      inject: ['ICollectionRepository', 'IPaymentRepository', 'IOfferReadPort', 'IPaymentGateway', SettlePaymentUseCase],
    },
    {
      provide: CancelCollectionUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        offerReadPort: IOfferReadPort,
        eventPublisher: IEventPublisher,
        messageMaker: ICollectionMessageMaker,
      ) => new CancelCollectionUseCase(collectionRepo, offerReadPort, eventPublisher, messageMaker),
      inject: ['ICollectionRepository', 'IOfferReadPort', 'IEventPublisher', 'ICollectionMessageMaker'],
    },
    {
      provide: GetCollectionsUseCase,
      useFactory: (collectionRepo: ICollectionRepository, offerReadPort: IOfferReadPort) =>
        new GetCollectionsUseCase(collectionRepo, offerReadPort),
      inject: ['ICollectionRepository', 'IOfferReadPort'],
    },
    {
      provide: GetCollectionByOfferUseCase,
      useFactory: (collectionRepo: ICollectionRepository, offerReadPort: IOfferReadPort) =>
        new GetCollectionByOfferUseCase(collectionRepo, offerReadPort),
      inject: ['ICollectionRepository', 'IOfferReadPort'],
    },
    {
      provide: GetCollectionDetailUseCase,
      useFactory: (
        collectionRepo: ICollectionRepository,
        paymentRepo: IPaymentRepository,
        offerReadPort: IOfferReadPort,
      ) => new GetCollectionDetailUseCase(collectionRepo, paymentRepo, offerReadPort),
      inject: ['ICollectionRepository', 'IPaymentRepository', 'IOfferReadPort'],
    },

    // ── Consumer ──────────────────────────────────────────────────────────────
    PaymentExecuteConsumer,
  ],
})
export class CollectionsModule {}
