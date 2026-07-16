import { Payment } from './payment.entity';

describe('Payment', () => {
  describe('createPending', () => {
    it('calcula fee y monto neto con la tasa dada', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05);

      expect(payment.getStatus()).toBe('pending');
      expect(payment.getGrossAmount()).toBe(100);
      expect(payment.getTreasureflowFee()).toBe(5);
      expect(payment.getReceiverNetAmount()).toBe(95);
      expect(payment.getPaypalTransactionId()).toBeNull();
    });

    it('redondea fee y neto a 2 decimales', () => {
      // 43.75 * 0.05 = 2.1875 → 2.19; neto 43.75 - 2.19 = 41.56
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 43.75, 0.05);

      expect(payment.getTreasureflowFee()).toBe(2.19);
      expect(payment.getReceiverNetAmount()).toBe(41.56);
    });

    it('con tasa 0 el neto es igual al bruto', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 50, 0);

      expect(payment.getTreasureflowFee()).toBe(0);
      expect(payment.getReceiverNetAmount()).toBe(50);
    });
  });

  describe('attachPaypalOrder', () => {
    it('guarda el order id sin cambiar el estado', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05);

      payment.attachPaypalOrder('ORDER-123');

      expect(payment.getPaypalTransactionId()).toBe('ORDER-123');
      expect(payment.getStatus()).toBe('pending');
    });
  });

  describe('markReleased', () => {
    it('cambia a released y reemplaza el order id por el capture id', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05);
      payment.attachPaypalOrder('ORDER-123');

      payment.markReleased('CAPTURE-456');

      expect(payment.getStatus()).toBe('released');
      expect(payment.getPaypalTransactionId()).toBe('CAPTURE-456');
    });
  });

  describe('markFailed', () => {
    it('cambia a failed', () => {
      const payment = Payment.createPending('pay-1', 'col-1', 'local-1', 'citizen-1', 100, 0.05);

      payment.markFailed();

      expect(payment.getStatus()).toBe('failed');
    });
  });
});
