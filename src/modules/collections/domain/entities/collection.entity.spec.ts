import { Collection, CollectionProps, CollectionStatus } from './collection.entity';
import { InvalidCollectionTransitionException } from '../exceptions/invalid-collection-transition.exception';
import { InvalidQuantityException } from '../exceptions/invalid-quantity.exception';

function buildCollection(status: CollectionStatus): Collection {
  const props: CollectionProps = {
    collectionId: 'col-1',
    offerId: 'offer-1',
    deliveryCode: 'code-abc',
    deliveryScannedAt: null,
    actualQuantity: null,
    finalAmount: null,
    citizenConfirmedAmount: false,
    amountConfirmationDate: null,
    status,
    createdAt: new Date('2026-07-01T10:00:00Z'),
  };
  return Collection.reconstitute(props);
}

describe('Collection', () => {
  describe('createForAcceptedOffer', () => {
    it('inicia en pending_delivery con los datos correctos', () => {
      const collection = Collection.createForAcceptedOffer('col-1', 'offer-1', 'code-abc');

      expect(collection.getStatus()).toBe('pending_delivery');
      expect(collection.getCollectionId()).toBe('col-1');
      expect(collection.getOfferId()).toBe('offer-1');
      expect(collection.getFinalAmount()).toBeNull();
      expect(collection.isAmountConfirmed()).toBe(false);
    });
  });

  describe('registerWeighing', () => {
    it('pending_delivery → pending_confirmation, registra recepción y calcula finalAmount', () => {
      const collection = buildCollection('pending_delivery');
      const now = new Date('2026-07-15T12:00:00Z');

      collection.registerWeighing(3.5, 12.5, now);

      expect(collection.getStatus()).toBe('pending_confirmation');
      expect(collection.getDeliveryScannedAt()).toEqual(now);
      expect(collection.getActualQuantity()).toBe(3.5);
      expect(collection.getFinalAmount()).toBe(43.75);
    });

    it('redondea a 2 decimales sin errores de coma flotante', () => {
      const collection = buildCollection('pending_delivery');

      // 0.1 * 3 = 0.30000000000000004 en float
      collection.registerWeighing(0.1, 3);

      expect(collection.getFinalAmount()).toBe(0.3);
    });

    it('rechaza cantidad cero', () => {
      const collection = buildCollection('pending_delivery');
      expect(() => collection.registerWeighing(0, 10)).toThrow(InvalidQuantityException);
    });

    it('rechaza cantidad negativa', () => {
      const collection = buildCollection('pending_delivery');
      expect(() => collection.registerWeighing(-1, 10)).toThrow(InvalidQuantityException);
    });

    it('rechaza cantidad no finita', () => {
      const collection = buildCollection('pending_delivery');
      expect(() => collection.registerWeighing(NaN, 10)).toThrow(InvalidQuantityException);
    });

    it.each<CollectionStatus>([
      'pending_confirmation',
      'pending_payment',
      'completed',
      'cancelled_by_citizen',
      'cancelled_by_establishment',
    ])('lanza excepción desde %s', (status) => {
      const collection = buildCollection(status);
      expect(() => collection.registerWeighing(1, 10)).toThrow(
        InvalidCollectionTransitionException,
      );
    });
  });

  describe('confirmAmount', () => {
    it('pending_confirmation → pending_payment y marca confirmación', () => {
      const collection = buildCollection('pending_confirmation');
      const now = new Date('2026-07-15T13:00:00Z');

      collection.confirmAmount(now);

      expect(collection.getStatus()).toBe('pending_payment');
      expect(collection.isAmountConfirmed()).toBe(true);
      expect(collection.getAmountConfirmationDate()).toEqual(now);
    });

    it.each<CollectionStatus>([
      'pending_delivery',
      'pending_payment',
      'completed',
      'cancelled_by_citizen',
      'cancelled_by_establishment',
    ])('lanza excepción desde %s', (status) => {
      const collection = buildCollection(status);
      expect(() => collection.confirmAmount()).toThrow(InvalidCollectionTransitionException);
    });
  });

  describe('complete', () => {
    it('pending_payment → completed', () => {
      const collection = buildCollection('pending_payment');
      collection.complete();
      expect(collection.getStatus()).toBe('completed');
    });

    it.each<CollectionStatus>([
      'pending_delivery',
      'pending_confirmation',
      'completed',
      'cancelled_by_citizen',
      'cancelled_by_establishment',
    ])('lanza excepción desde %s', (status) => {
      const collection = buildCollection(status);
      expect(() => collection.complete()).toThrow(InvalidCollectionTransitionException);
    });
  });

  describe('cancelByCitizen', () => {
    it('solo permitido desde pending_delivery', () => {
      const collection = buildCollection('pending_delivery');
      collection.cancelByCitizen();
      expect(collection.getStatus()).toBe('cancelled_by_citizen');
    });

    it.each<CollectionStatus>([
      'pending_confirmation',
      'pending_payment',
      'completed',
      'cancelled_by_citizen',
      'cancelled_by_establishment',
    ])('lanza excepción desde %s', (status) => {
      const collection = buildCollection(status);
      expect(() => collection.cancelByCitizen()).toThrow(
        InvalidCollectionTransitionException,
      );
    });
  });

  describe('cancelByEstablishment', () => {
    it('solo permitido desde pending_delivery', () => {
      const collection = buildCollection('pending_delivery');
      collection.cancelByEstablishment();
      expect(collection.getStatus()).toBe('cancelled_by_establishment');
    });

    it.each<CollectionStatus>([
      'pending_confirmation',
      'pending_payment',
      'completed',
      'cancelled_by_citizen',
      'cancelled_by_establishment',
    ])('lanza excepción desde %s', (status) => {
      const collection = buildCollection(status);
      expect(() => collection.cancelByEstablishment()).toThrow(
        InvalidCollectionTransitionException,
      );
    });
  });

  describe('flujo completo feliz', () => {
    it('recorre todos los estados en orden', () => {
      const collection = Collection.createForAcceptedOffer('col-1', 'offer-1', 'code-abc');

      collection.registerWeighing(2, 15);
      collection.confirmAmount();
      collection.complete();

      expect(collection.getStatus()).toBe('completed');
      expect(collection.getFinalAmount()).toBe(30);
    });
  });
});
