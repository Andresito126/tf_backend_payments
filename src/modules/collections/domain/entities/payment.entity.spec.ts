import { Payment } from './payment.entity';

describe('Payment', () => {
  describe('createPending', () => {
    it('calcula fee y monto neto con la tasa dada', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05, 'card');

      expect(payment.getStatus()).toBe('pending');
      expect(payment.getGrossAmount()).toBe(100);
      expect(payment.getTreasureflowFee()).toBe(5);
      expect(payment.getReceiverNetAmount()).toBe(95);
      expect(payment.getPaymentMethod()).toBe('card');
      expect(payment.getGatewayOrderId()).toBeNull();
      expect(payment.getPaymentReference()).toBeNull();
    });

    it('redondea fee y neto a 2 decimales', () => {
      // 43.75 * 0.05 = 2.1875 → 2.19; neto 43.75 - 2.19 = 41.56
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 43.75, 0.05, 'cash');

      expect(payment.getTreasureflowFee()).toBe(2.19);
      expect(payment.getReceiverNetAmount()).toBe(41.56);
    });

    it('con tasa 0 el neto es igual al bruto', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 50, 0, 'transfer');

      expect(payment.getTreasureflowFee()).toBe(0);
      expect(payment.getReceiverNetAmount()).toBe(50);
    });
  });

  describe('attachGatewayOrder', () => {
    it('guarda orden, cargo y referencia sin cambiar el estado', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05, 'cash');

      payment.attachGatewayOrder('ord_123', 'ch_456', '93000012345678');

      expect(payment.getGatewayOrderId()).toBe('ord_123');
      expect(payment.getGatewayChargeId()).toBe('ch_456');
      expect(payment.getPaymentReference()).toBe('93000012345678');
      expect(payment.getStatus()).toBe('pending');
    });
  });

  describe('transiciones de estado', () => {
    it('pending → paid_held → released', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05, 'card');

      payment.markPaidHeld();
      expect(payment.getStatus()).toBe('paid_held');

      payment.markReleased();
      expect(payment.getStatus()).toBe('released');
      expect(payment.isReleased()).toBe(true);
    });

    it('markFailed cambia a failed', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05, 'card');

      payment.markFailed();

      expect(payment.getStatus()).toBe('failed');
    });
  });
});
