import { Injectable } from '@nestjs/common';
import { PostgreSQl } from '../../../../core/database/postgresql.connection';
import { IOfferReadPort, OfferPricing } from '../../application/ports/offer-read.port';
import type { IFieldEncryptor } from '../../../common/ports/field-encryptor.port';

@Injectable()
export class PostgresOfferReadAdapter implements IOfferReadPort {
  constructor(
    private readonly db: PostgreSQl,
    private readonly encryptor: IFieldEncryptor,
  ) {}

  async getOfferPricing(offerId: string): Promise<OfferPricing | null> {
    const result = await this.db.query(
      `SELECT
         o.offer_id,
         p.citizen_id,
         o.establishment_id,
         o.waste_publication_id,
         o.price_per_unit,
         o.unit,
         mt.name AS material_type_name,
         (SELECT pp.url FROM publication_photos pp
          WHERE pp.publication_id = p.id
          LIMIT 1) AS photo_url,
         c.first_name,
         c.paternal_last_name,
         e.store_name
       FROM offers o
       JOIN publications p ON p.id = o.waste_publication_id
       JOIN waste_publications wp ON wp.publication_id = p.id
       JOIN material_types mt ON mt.id = wp.material_type_id
       LEFT JOIN citizens c ON c.user_id = p.citizen_id
       LEFT JOIN establishments e ON e.user_id = o.establishment_id
       WHERE o.offer_id = $1`,
      [offerId],
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];

    const firstName = this.safeDecrypt(row.first_name as string | null);
    const lastName = this.safeDecrypt(row.paternal_last_name as string | null);
    const citizenName = `${firstName} ${lastName}`.trim();

    return {
      offerId: row.offer_id as string,
      citizenId: row.citizen_id as string,
      establishmentId: row.establishment_id as string,
      wastePublicationId: row.waste_publication_id as string,
      pricePerUnit: Number(row.price_per_unit),
      unit: row.unit as string,
      wastePublicationTitle: (row.material_type_name as string | null) ?? null,
      wastePublicationPhotoUrl: (row.photo_url as string | null) ?? null,
      citizenName: citizenName || null,
      establishmentName: (row.store_name as string | null) ?? null,
    };
  }

  private safeDecrypt(value: string | null): string {
    if (!value) return '';
    try {
      return this.encryptor.decrypt(value);
    } catch {
      return '';
    }
  }
}
