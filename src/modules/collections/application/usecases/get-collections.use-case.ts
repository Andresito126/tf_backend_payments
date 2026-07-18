import type { Collection } from '../../domain/entities/collection.entity';
import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IOfferReadPort, OfferPricing } from '../ports/offer-read.port';

export interface GetCollectionsInput {
  userId: string;
  userType: 'citizen' | 'establishment';
}

export interface CollectionListItem {
  collection: Collection;
  offer: OfferPricing | null;
}

export class GetCollectionsUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly offerReadPort: IOfferReadPort,
  ) {}

  async execute(input: GetCollectionsInput): Promise<CollectionListItem[]> {
    const collections = await this.collectionRepository.findByUser(input.userId, input.userType);
    return Promise.all(
      collections.map(async (collection) => ({
        collection,
        offer: await this.offerReadPort.getOfferPricing(collection.getOfferId()),
      })),
    );
  }
}
