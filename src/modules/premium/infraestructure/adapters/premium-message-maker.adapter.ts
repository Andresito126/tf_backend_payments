import { Injectable } from '@nestjs/common';
import { PostgreSQl } from '../../../../core/database/postgresql.connection';
import type { NotificationPayload } from '../../../collections/application/ports/collection-message-maker.port';
import type { IPremiumMessageMaker } from '../../application/ports/premium-message-maker.port';
import type { IFieldEncryptor } from '../../../common/ports/field-encryptor.port';

@Injectable()
export class PremiumMessageMakerAdapter implements IPremiumMessageMaker {
  constructor(
    private readonly db: PostgreSQl,
    private readonly encryptor: IFieldEncryptor,
  ) {}

  async makePremiumActivatedMessage(userId: string, expiresAt: Date): Promise<NotificationPayload> {
    const fcmToken = await this.getDecryptedFcmToken(userId);
    const formattedDate = expiresAt.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    });
    return {
      recipientUserIds: [userId],
      recipientFcmTokens: fcmToken ? [fcmToken] : [],
      title: '¡Ya eres Premium! 🎉',
      body: `Tu plan estará activo hasta el ${formattedDate}.`,
      type: 'PREMIUM_ACTIVATED',
      screenRoute: '/homeCitizen',
      metadata: { premiumExpiresAt: expiresAt.toISOString() },
    };
  }

  private async getDecryptedFcmToken(userId: string): Promise<string | null> {
    const result = await this.db.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
    const encrypted = result.rows[0]?.fcm_token as string | null;
    if (!encrypted) return null;
    try {
      return this.encryptor.decrypt(encrypted);
    } catch {
      return null;
    }
  }
}
