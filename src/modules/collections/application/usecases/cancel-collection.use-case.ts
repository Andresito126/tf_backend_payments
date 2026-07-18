import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import type { IEventPublisher } from '../../../common/ports/event-publisher.port';
import type { ICollectionMessageMaker } from '../ports/collection-message-maker.port';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';
import { CollectionOwnershipException } from '../../domain/exceptions/collection-ownership.exception';

export interface CancelCollectionInput {
  collectionId: string;
  userId: string;
  userType: 'citizen' | 'establishment';
}

export class CancelCollectionUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly offerReadPort: IOfferReadPort,
    private readonly eventPublisher: IEventPublisher,
    private readonly messageMaker: ICollectionMessageMaker,
  ) {}

  async execute(input: CancelCollectionInput): Promise<void> {
    const collection = await this.collectionRepository.findById(input.collectionId);
    if (!collection) throw new CollectionNotFoundException();

    const offer = await this.offerReadPort.getOfferPricing(collection.getOfferId());
    if (!offer) throw new CollectionNotFoundException();

    const isOwner =
      input.userType === 'citizen'
        ? offer.citizenId === input.userId
        : offer.establishmentId === input.userId;

    if (!isOwner) throw new CollectionOwnershipException();

    if (input.userType === 'citizen') {
      collection.cancelByCitizen();
    } else {
      collection.cancelByEstablishment();
    }

    await this.collectionRepository.update(collection);

    const recipientId = input.userType === 'citizen' ? offer.establishmentId : offer.citizenId;

    try {
      const msg = await this.messageMaker.makeCancellationMessage(
        collection.getCollectionId(),
        recipientId,
        input.userType,
      );
      await this.eventPublisher.publish('notifications', 'notification.push', msg);
    } catch (err) {
      console.error('[CancelCollection] Notificación fallida:', err instanceof Error ? err.message : String(err));
    }
  }
}
