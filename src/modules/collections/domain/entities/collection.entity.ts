import { roundMoney } from '../../../../core/utils/money.util';
import { InvalidCollectionTransitionException } from '../exceptions/invalid-collection-transition.exception';
import { InvalidQuantityException } from '../exceptions/invalid-quantity.exception';

export type CollectionStatus =
  | 'pending_delivery'
  | 'pending_weighing'
  | 'pending_confirmation'
  | 'pending_payment'
  | 'completed'
  | 'cancelled_by_establishment'
  | 'cancelled_by_citizen';

export interface CollectionProps {
  collectionId: string;
  offerId: string;
  deliveryCode: string;
  deliveryScannedAt: Date | null;
  actualQuantity: number | null;
  finalAmount: number | null;
  citizenConfirmedAmount: boolean;
  amountConfirmationDate: Date | null;
  status: CollectionStatus;
  createdAt: Date;
}

export class Collection {
  private constructor(private readonly props: CollectionProps) {}

  static createForAcceptedOffer(
    collectionId: string,
    offerId: string,
    deliveryCode: string,
  ): Collection {
    return new Collection({
      collectionId,
      offerId,
      deliveryCode,
      deliveryScannedAt: null,
      actualQuantity: null,
      finalAmount: null,
      citizenConfirmedAmount: false,
      amountConfirmationDate: null,
      status: 'pending_delivery',
      createdAt: new Date(),
    });
  }

  static reconstitute(props: CollectionProps): Collection {
    return new Collection(props);
  }

  // ── Transiciones ───────────────────────────────────────────────────────────

  scanDelivery(now: Date = new Date()): void {
    this.assertStatus('pending_delivery', 'escanear entrega');
    this.props.status = 'pending_weighing';
    this.props.deliveryScannedAt = now;
  }

  registerWeighing(actualQuantity: number, pricePerUnit: number): void {
    this.assertStatus('pending_weighing', 'registrar pesaje');
    if (!Number.isFinite(actualQuantity) || actualQuantity <= 0) {
      throw new InvalidQuantityException();
    }
    this.props.actualQuantity = actualQuantity;
    this.props.finalAmount = roundMoney(actualQuantity * pricePerUnit);
    this.props.status = 'pending_confirmation';
  }

  confirmAmount(now: Date = new Date()): void {
    this.assertStatus('pending_confirmation', 'confirmar monto');
    this.props.citizenConfirmedAmount = true;
    this.props.amountConfirmationDate = now;
    this.props.status = 'pending_payment';
  }

  complete(): void {
    this.assertStatus('pending_payment', 'completar');
    this.props.status = 'completed';
  }

  cancelByCitizen(): void {
    this.assertStatus('pending_delivery', 'cancelar (ciudadano)');
    this.props.status = 'cancelled_by_citizen';
  }

  cancelByEstablishment(): void {
    if (
      this.props.status !== 'pending_delivery' &&
      this.props.status !== 'pending_weighing'
    ) {
      throw new InvalidCollectionTransitionException(
        this.props.status,
        'cancelar (establecimiento)',
      );
    }
    this.props.status = 'cancelled_by_establishment';
  }

  private assertStatus(expected: CollectionStatus, action: string): void {
    if (this.props.status !== expected) {
      throw new InvalidCollectionTransitionException(this.props.status, action);
    }
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  getCollectionId(): string {
    return this.props.collectionId;
  }

  getOfferId(): string {
    return this.props.offerId;
  }

  getDeliveryCode(): string {
    return this.props.deliveryCode;
  }

  getDeliveryScannedAt(): Date | null {
    return this.props.deliveryScannedAt;
  }

  getActualQuantity(): number | null {
    return this.props.actualQuantity;
  }

  getFinalAmount(): number | null {
    return this.props.finalAmount;
  }

  isAmountConfirmed(): boolean {
    return this.props.citizenConfirmedAmount;
  }

  getAmountConfirmationDate(): Date | null {
    return this.props.amountConfirmationDate;
  }

  getStatus(): CollectionStatus {
    return this.props.status;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }
}
