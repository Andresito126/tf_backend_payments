import { Injectable } from '@nestjs/common';
import { PostgreSQl } from '../../../../core/database/postgresql.connection';
import { ICollectionMessageMaker, NotificationPayload } from '../../application/ports/collection-message-maker.port';
import type { IFieldEncryptor } from '../../../common/ports/field-encryptor.port';

@Injectable()
export class CollectionMessageMakerAdapter implements ICollectionMessageMaker {
  constructor(
    private readonly db: PostgreSQl,
    private readonly encryptor: IFieldEncryptor,
  ) {}

  async makeCollectionCreatedMessage(collectionId: string, citizenId: string): Promise<NotificationPayload> {
    const fcmToken = await this.getDecryptedFcmToken(citizenId);
    return {
      recipientUserIds: [citizenId],
      recipientFcmTokens: fcmToken ? [fcmToken] : [],
      title: 'Recolección iniciada',
      body: 'Se creó una recolección para tu publicación. Entrega tus residuos al establecimiento.',
      type: 'COLLECTION_CREATED',
      screenRoute: `/collectionDetail/${collectionId}`,
      metadata: { collectionId },
    };
  }

  async makeCollectionCreatedEstablishmentMessage(
    collectionId: string,
    establishmentId: string,
  ): Promise<NotificationPayload> {
    const fcmToken = await this.getDecryptedFcmToken(establishmentId);
    return {
      recipientUserIds: [establishmentId],
      recipientFcmTokens: fcmToken ? [fcmToken] : [],
      title: 'Nueva recolección',
      body: 'Un ciudadano aceptó tu oferta. Pesa el material cuando lo recibas.',
      type: 'COLLECTION_CREATED',
      screenRoute: `/collectionDetail/${collectionId}`,
      metadata: { collectionId },
    };
  }

  async makeAmountPendingConfirmationMessage(
    collectionId: string,
    citizenId: string,
    amount: number,
  ): Promise<NotificationPayload> {
    const fcmToken = await this.getDecryptedFcmToken(citizenId);
    return {
      recipientUserIds: [citizenId],
      recipientFcmTokens: fcmToken ? [fcmToken] : [],
      title: 'Confirma el monto de tu recolección',
      body: `El establecimiento registró $${amount.toFixed(2)} por tus residuos. Confirma para continuar.`,
      type: 'AMOUNT_PENDING_CONFIRMATION',
      screenRoute: `/collectionDetail/${collectionId}`,
      metadata: { collectionId, amount },
    };
  }

  async makeAmountConfirmedMessage(collectionId: string, establishmentId: string): Promise<NotificationPayload> {
    const fcmToken = await this.getDecryptedFcmToken(establishmentId);
    return {
      recipientUserIds: [establishmentId],
      recipientFcmTokens: fcmToken ? [fcmToken] : [],
      title: 'Monto confirmado — realiza el pago',
      body: 'El ciudadano confirmó el monto. Ya puedes proceder con el pago.',
      type: 'AMOUNT_CONFIRMED',
      screenRoute: `/collectionDetail/${collectionId}`,
      metadata: { collectionId },
    };
  }

  async makePaymentReceivedMessage(
    collectionId: string,
    citizenId: string,
    netAmount: number,
  ): Promise<NotificationPayload> {
    const fcmToken = await this.getDecryptedFcmToken(citizenId);
    return {
      recipientUserIds: [citizenId],
      recipientFcmTokens: fcmToken ? [fcmToken] : [],
      title: '¡Pago recibido!',
      body: `El pago de $${netAmount.toFixed(2)} por tus residuos fue confirmado.`,
      type: 'PAYMENT_RECEIVED',
      screenRoute: `/collectionDetail/${collectionId}`,
      metadata: { collectionId, netAmount },
    };
  }

  async makeCancellationMessage(
    collectionId: string,
    recipientId: string,
    cancelledBy: 'citizen' | 'establishment',
  ): Promise<NotificationPayload> {
    const fcmToken = await this.getDecryptedFcmToken(recipientId);
    const body =
      cancelledBy === 'citizen'
        ? 'El ciudadano canceló la recolección.'
        : 'El establecimiento canceló la recolección.';
    return {
      recipientUserIds: [recipientId],
      recipientFcmTokens: fcmToken ? [fcmToken] : [],
      title: 'Recolección cancelada',
      body,
      type: 'COLLECTION_CANCELLED',
      screenRoute: `/collectionDetail/${collectionId}`,
      metadata: { collectionId },
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
