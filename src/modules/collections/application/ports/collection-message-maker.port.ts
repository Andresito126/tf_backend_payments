export interface NotificationPayload {
  recipientUserIds: string[];
  recipientFcmTokens: string[];
  title: string;
  body: string;
  type: string;
  screenRoute: string;
  metadata: Record<string, unknown>;
}

export interface ICollectionMessageMaker {
  makeCollectionCreatedMessage(collectionId: string, citizenId: string): Promise<NotificationPayload>;
  makeCollectionCreatedEstablishmentMessage(collectionId: string, establishmentId: string): Promise<NotificationPayload>;
  makeAmountPendingConfirmationMessage(collectionId: string, citizenId: string, amount: number): Promise<NotificationPayload>;
  makeAmountConfirmedMessage(collectionId: string, establishmentId: string): Promise<NotificationPayload>;
  makePaymentReceivedMessage(collectionId: string, citizenId: string, netAmount: number): Promise<NotificationPayload>;
  makeCancellationMessage(collectionId: string, recipientId: string, cancelledBy: 'citizen' | 'establishment'): Promise<NotificationPayload>;
}
