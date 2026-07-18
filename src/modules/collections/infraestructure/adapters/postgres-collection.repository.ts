import { Injectable } from '@nestjs/common';
import { PostgreSQl } from '../../../../core/database/postgresql.connection';
import { ICollectionRepository } from '../../domain/repositories/collection.repository';
import { Collection, CollectionProps } from '../../domain/entities/collection.entity';

@Injectable()
export class PostgresCollectionRepository implements ICollectionRepository {
  constructor(private readonly db: PostgreSQl) {}

  async findById(id: string): Promise<Collection | null> {
    const result = await this.db.query(
      'SELECT * FROM collections WHERE collection_id = $1',
      [id],
    );
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findByDeliveryCode(code: string): Promise<Collection | null> {
    const result = await this.db.query(
      'SELECT * FROM collections WHERE delivery_code = $1',
      [code],
    );
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findByOfferId(offerId: string): Promise<Collection | null> {
    const result = await this.db.query(
      'SELECT * FROM collections WHERE offer_id = $1',
      [offerId],
    );
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findByUser(userId: string, userType: 'citizen' | 'establishment'): Promise<Collection[]> {
    const query =
      userType === 'citizen'
        ? `SELECT c.* FROM collections c
           JOIN offers o ON o.offer_id = c.offer_id
           JOIN publications p ON p.id = o.waste_publication_id
           WHERE p.citizen_id = $1
           ORDER BY c.created_at DESC`
        : `SELECT c.* FROM collections c
           JOIN offers o ON o.offer_id = c.offer_id
           WHERE o.establishment_id = $1
           ORDER BY c.created_at DESC`;

    const result = await this.db.query(query, [userId]);
    return result.rows.map((row) => this.mapToEntity(row));
  }

  async save(collection: Collection): Promise<void> {
    await this.db.query(
      `INSERT INTO collections (
        collection_id, offer_id, delivery_code, delivery_scanned_at,
        actual_quantity, final_amount, citizen_confirmed_amount,
        amount_confirmation_date, status, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (offer_id) DO NOTHING`,
      [
        collection.getCollectionId(),
        collection.getOfferId(),
        collection.getDeliveryCode(),
        collection.getDeliveryScannedAt(),
        collection.getActualQuantity(),
        collection.getFinalAmount(),
        collection.isAmountConfirmed(),
        collection.getAmountConfirmationDate(),
        collection.getStatus(),
        collection.getCreatedAt(),
      ],
    );
  }

  async update(collection: Collection): Promise<void> {
    await this.db.query(
      `UPDATE collections SET
        delivery_scanned_at      = $2,
        actual_quantity          = $3,
        final_amount             = $4,
        citizen_confirmed_amount = $5,
        amount_confirmation_date = $6,
        status                   = $7
       WHERE collection_id = $1`,
      [
        collection.getCollectionId(),
        collection.getDeliveryScannedAt(),
        collection.getActualQuantity(),
        collection.getFinalAmount(),
        collection.isAmountConfirmed(),
        collection.getAmountConfirmationDate(),
        collection.getStatus(),
      ],
    );
  }

  private mapToEntity(row: Record<string, unknown>): Collection {
    const props: CollectionProps = {
      collectionId: row.collection_id as string,
      offerId: row.offer_id as string,
      deliveryCode: row.delivery_code as string,
      deliveryScannedAt: row.delivery_scanned_at as Date | null,
      actualQuantity: row.actual_quantity != null ? Number(row.actual_quantity) : null,
      finalAmount: row.final_amount != null ? Number(row.final_amount) : null,
      citizenConfirmedAmount: row.citizen_confirmed_amount as boolean,
      amountConfirmationDate: row.amount_confirmation_date as Date | null,
      status: row.status as CollectionProps['status'],
      createdAt: row.created_at as Date,
    };
    return Collection.reconstitute(props);
  }
}
