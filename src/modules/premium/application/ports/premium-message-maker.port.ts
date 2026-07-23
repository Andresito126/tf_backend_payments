import type { NotificationPayload } from '../../../collections/application/ports/collection-message-maker.port';

export interface IPremiumMessageMaker {
  makePremiumActivatedMessage(userId: string, expiresAt: Date): Promise<NotificationPayload>;
}
