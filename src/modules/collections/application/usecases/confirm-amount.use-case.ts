import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import type { IEventPublisher } from '../../../common/ports/event-publisher.port';
import type { ICollectionMessageMaker } from '../ports/collection-message-maker.port';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';
import { CollectionOwnershipException } from '../../domain/exceptions/collection-ownership.exception';

export interface ConfirmAmountInput {
  collectionId: string;
  citizenId: string;
}

export class ConfirmAmountUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly offerReadPort: IOfferReadPort,
    private readonly eventPublisher: IEventPublisher,
    private readonly messageMaker: ICollectionMessageMaker,
  ) {}

  async execute(input: ConfirmAmountInput): Promise<void> {
    const collection = await this.collectionRepository.findById(input.collectionId);
    if (!collection) throw new CollectionNotFoundException();

    const offer = await this.offerReadPort.getOfferPricing(collection.getOfferId());
    if (!offer || offer.citizenId !== input.citizenId) {
      throw new CollectionOwnershipException();
    }

    collection.confirmAmount();
    await this.collectionRepository.update(collection);

    try {
      const msg = await this.messageMaker.makeAmountConfirmedMessage(
        collection.getCollectionId(),
        offer.establishmentId,
      );
      await this.eventPublisher.publish('notifications', 'notification.push', msg);
    } catch (err) {
      console.error('[ConfirmAmount] Notificación fallida:', err instanceof Error ? err.message : String(err));
    }
  }
}
