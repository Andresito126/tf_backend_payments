import type { Collection } from '../../domain/entities/collection.entity';
import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IOfferReadPort } from '../ports/offer-read.port';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';
import { CollectionOwnershipException } from '../../domain/exceptions/collection-ownership.exception';

export interface GetCollectionByOfferInput {
  offerId: string;
  userId: string;
  userType: 'citizen' | 'establishment';
}

export class GetCollectionByOfferUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly offerReadPort: IOfferReadPort,
  ) {}

  async execute(input: GetCollectionByOfferInput): Promise<Collection> {
    const collection = await this.collectionRepository.findByOfferId(input.offerId);
    if (!collection) throw new CollectionNotFoundException();

    const offer = await this.offerReadPort.getOfferPricing(input.offerId);
    const isOwner =
      input.userType === 'citizen'
        ? offer?.citizenId === input.userId
        : offer?.establishmentId === input.userId;

    if (!offer || !isOwner) throw new CollectionOwnershipException();

    return collection;
  }
}
