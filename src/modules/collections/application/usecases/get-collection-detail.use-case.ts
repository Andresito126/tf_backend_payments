import type { Collection } from '../../domain/entities/collection.entity';
import type { Payment } from '../../domain/entities/payment.entity';
import type { ICollectionRepository } from '../../domain/repositories/collection.repository';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository';
import type { IOfferReadPort, OfferPricing } from '../ports/offer-read.port';
import { CollectionNotFoundException } from '../../domain/exceptions/collection-not-found.exception';
import { CollectionOwnershipException } from '../../domain/exceptions/collection-ownership.exception';

export interface GetCollectionDetailInput {
  collectionId: string;
  userId: string;
  userType: 'citizen' | 'establishment';
}

export interface CollectionDetailResult {
  collection: Collection;
  payment: Payment | null;
  offer: OfferPricing;
}

export class GetCollectionDetailUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly offerReadPort: IOfferReadPort,
  ) {}

  async execute(input: GetCollectionDetailInput): Promise<CollectionDetailResult> {
    const collection = await this.collectionRepository.findById(input.collectionId);
    if (!collection) throw new CollectionNotFoundException();

    const offer = await this.offerReadPort.getOfferPricing(collection.getOfferId());
    if (!offer) throw new CollectionNotFoundException();

    const isOwner =
      input.userType === 'citizen'
        ? offer.citizenId === input.userId
        : offer.establishmentId === input.userId;

    if (!isOwner) throw new CollectionOwnershipException();

    const payment = await this.paymentRepository.findByCollectionId(input.collectionId);

    return { collection, payment, offer };
  }
}
