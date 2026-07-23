import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import type { IEventPublisher } from '../../../common/ports/event-publisher.port';
import type { ICollectionMessageMaker } from '../ports/collection-message-maker.port';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';
import { CollectionOwnershipException } from '../../domain/exceptions/collection-ownership.exception';

export interface RegisterWeighingInput {
  collectionId: string;
  establishmentId: string;
  actualQuantity: number;
  manualFinalAmount?: number;
}

export class RegisterWeighingUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly offerReadPort: IOfferReadPort,
    private readonly eventPublisher: IEventPublisher,
    private readonly messageMaker: ICollectionMessageMaker,
  ) {}

  async execute(input: RegisterWeighingInput): Promise<void> {
    const collection = await this.collectionRepository.findById(input.collectionId);
    if (!collection) throw new CollectionNotFoundException();

    const offer = await this.offerReadPort.getOfferPricing(collection.getOfferId());
    if (!offer || offer.establishmentId !== input.establishmentId) {
      throw new CollectionOwnershipException();
    }

    collection.registerWeighing(input.actualQuantity, offer.pricePerUnit, input.manualFinalAmount);
    await this.collectionRepository.update(collection);

    try {
      const msg = await this.messageMaker.makeAmountPendingConfirmationMessage(
        collection.getCollectionId(),
        offer.citizenId,
        collection.getFinalAmount()!,
      );
      await this.eventPublisher.publish('notifications', 'notification.push', msg);
    } catch (err) {
      console.error('[RegisterWeighing] Notificación fallida:', err instanceof Error ? err.message : String(err));
    }
  }
}
