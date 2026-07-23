import { Injectable } from '@nestjs/common';
import { PostgreSQl } from '../../../../core/database/postgresql.connection';
import type {
  IPremiumUserRepository,
  PremiumUserStatus,
} from '../../application/ports/premium-user.repository';

@Injectable()
export class PostgresPremiumUserRepository implements IPremiumUserRepository {
  constructor(private readonly db: PostgreSQl) {}

  async getStatus(userId: string): Promise<PremiumUserStatus | null> {
    const result = await this.db.query(
      'SELECT is_premium, premium_expires_at FROM users WHERE id = $1',
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      isPremiumFlag: Boolean(row.is_premium),
      premiumExpiresAt: row.premium_expires_at ? new Date(row.premium_expires_at) : null,
    };
  }

  async activatePremium(userId: string): Promise<Date> {
    const result = await this.db.query(
      `UPDATE users
       SET is_premium = TRUE,
           premium_expires_at = GREATEST(COALESCE(premium_expires_at, NOW()), NOW()) + INTERVAL '30 days'
       WHERE id = $1
       RETURNING premium_expires_at`,
      [userId],
    );
    return new Date(result.rows[0].premium_expires_at);
  }
}
