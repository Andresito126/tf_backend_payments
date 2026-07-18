import type { Collection } from '../entities/collection.entity';

export interface ICollectionRepository {
  findById(id: string): Promise<Collection | null>;
  findByDeliveryCode(code: string): Promise<Collection | null>;
  findByOfferId(offerId: string): Promise<Collection | null>;
  findByUser(userId: string, userType: 'citizen' | 'establishment'): Promise<Collection[]>;
  save(collection: Collection): Promise<void>;
  update(collection: Collection): Promise<void>;
}
