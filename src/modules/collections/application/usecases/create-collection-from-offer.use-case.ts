import { Collection } from '../../domain/entities/collection.entity';
import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import type { IIdGenerator } from '../../../common/ports/id-generator.port';
import type { IEventPublisher } from '../../../common/ports/event-publisher.port';
import type { ICollectionMessageMaker } from '../ports/collection-message-maker.port';

export interface CreateCollectionFromOfferInput {
  offerId: string;
  citizenId: string;
}

export class CreateCollectionFromOfferUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly offerReadPort: IOfferReadPort,
    private readonly idGenerator: IIdGenerator,
    private readonly eventPublisher: IEventPublisher,
    private readonly messageMaker: ICollectionMessageMaker,
  ) {}

  async execute(input: CreateCollectionFromOfferInput): Promise<void> {
    const existing = await this.collectionRepository.findByOfferId(input.offerId);
    if (existing) return;

    const collectionId = this.idGenerator.generate();
    const deliveryCode = this.idGenerator.generate();
    const collection = Collection.createForAcceptedOffer(collectionId, input.offerId, deliveryCode);

    await this.collectionRepository.save(collection);

    try {
      const msg = await this.messageMaker.makeCollectionCreatedMessage(collectionId, input.citizenId);
      await this.eventPublisher.publish('notifications', 'notification.push', msg);
    } catch (err) {
      console.error('[CreateCollectionFromOffer] Notificación (citizen) fallida:', err instanceof Error ? err.message : String(err));
    }

    try {
      const offer = await this.offerReadPort.getOfferPricing(input.offerId);
      if (offer) {
        const msg = await this.messageMaker.makeCollectionCreatedEstablishmentMessage(
          collectionId,
          offer.establishmentId,
        );
        await this.eventPublisher.publish('notifications', 'notification.push', msg);
      }
    } catch (err) {
      console.error('[CreateCollectionFromOffer] Notificación (establishment) fallida:', err instanceof Error ? err.message : String(err));
    }
  }
}
