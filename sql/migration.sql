-- Ejecutar una sola vez sobre la BD de TreasureFlow (local o RDS)

-- Idempotencia en la creación de collections (si no se corrió antes)
ALTER TABLE collections
  ADD CONSTRAINT collections_offer_id_key UNIQUE (offer_id);

-- Columnas para Conekta en payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) CHECK (payment_method IN ('card','cash','transfer')),
  ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(150),
  ADD COLUMN IF NOT EXISTS gateway_charge_id VARCHAR(150),
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(150);

-- Nuevos estados de pago: pending → paid_held → released | failed
ALTER TABLE payments DROP CONSTRAINT payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending','paid_held','released','failed'));
