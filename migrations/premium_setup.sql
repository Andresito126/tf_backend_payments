-- ============================================================
-- Premium Plan — migración de la tabla payments
-- ============================================================
-- Un pago de premium no cuelga de una collection ni de una reservation,
-- pero el CHECK XOR original obliga a exactamente una de las dos.
-- Se reemplaza por un CHECK coherente con el nuevo campo `purpose`.

-- 1) Encuentra el nombre real del CHECK XOR de payments:
--    SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'payments'::regclass AND contype = 'c';
--    (busca el que menciona collection_id y reservation_id) y bórralo:
-- ALTER TABLE payments DROP CONSTRAINT <nombre_encontrado>;
DO $$
DECLARE
  xor_constraint TEXT;
BEGIN
  SELECT conname INTO xor_constraint
  FROM pg_constraint
  WHERE conrelid = 'payments'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%collection_id%'
    AND pg_get_constraintdef(oid) LIKE '%reservation_id%';

  IF xor_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', xor_constraint);
  END IF;
END $$;

-- 2) Propósito del pago:
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'collection'
  CHECK (purpose IN ('collection', 'reservation', 'premium'));

-- 3) Nuevo CHECK coherente con el propósito:
ALTER TABLE payments ADD CONSTRAINT payments_target_check CHECK (
  (purpose = 'collection'  AND collection_id IS NOT NULL AND reservation_id IS NULL) OR
  (purpose = 'reservation' AND collection_id IS NULL AND reservation_id IS NOT NULL) OR
  (purpose = 'premium'     AND collection_id IS NULL AND reservation_id IS NULL)
);
