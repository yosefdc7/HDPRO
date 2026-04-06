-- Delivery receiving: disposition buckets + incoming visibility (incremental migration).
-- Use on databases created from an older hardware_inventory_pro_schema (physical received_* columns).
SET search_path TO inventory_pro, public;

ALTER TABLE delivery_lines
  ADD COLUMN IF NOT EXISTS accepted_qty numeric(18, 6),
  ADD COLUMN IF NOT EXISTS damaged_qty numeric(18, 6),
  ADD COLUMN IF NOT EXISTS missing_qty numeric(18, 6),
  ADD COLUMN IF NOT EXISTS rejected_qty numeric(18, 6),
  ADD COLUMN IF NOT EXISTS accepted_base_qty numeric(18, 6),
  ADD COLUMN IF NOT EXISTS damaged_base_qty numeric(18, 6),
  ADD COLUMN IF NOT EXISTS missing_base_qty numeric(18, 6),
  ADD COLUMN IF NOT EXISTS rejected_base_qty numeric(18, 6);

UPDATE delivery_lines SET
  accepted_qty = COALESCE(accepted_qty, received_qty, 0),
  damaged_qty = COALESCE(damaged_qty, 0),
  missing_qty = COALESCE(missing_qty, 0),
  rejected_qty = COALESCE(rejected_qty, 0),
  accepted_base_qty = COALESCE(accepted_base_qty, received_base_qty, 0),
  damaged_base_qty = COALESCE(damaged_base_qty, 0),
  missing_base_qty = COALESCE(missing_base_qty, 0),
  rejected_base_qty = COALESCE(rejected_base_qty, 0);

ALTER TABLE delivery_lines
  ALTER COLUMN accepted_qty SET NOT NULL,
  ALTER COLUMN damaged_qty SET NOT NULL,
  ALTER COLUMN missing_qty SET NOT NULL,
  ALTER COLUMN rejected_qty SET NOT NULL,
  ALTER COLUMN accepted_base_qty SET NOT NULL,
  ALTER COLUMN damaged_base_qty SET NOT NULL,
  ALTER COLUMN missing_base_qty SET NOT NULL,
  ALTER COLUMN rejected_base_qty SET NOT NULL;

ALTER TABLE delivery_lines DROP CONSTRAINT IF EXISTS delivery_lines_received_qty_check;
ALTER TABLE delivery_lines DROP CONSTRAINT IF EXISTS delivery_lines_received_base_qty_check;

ALTER TABLE delivery_lines DROP CONSTRAINT IF EXISTS delivery_lines_disposition_nonneg;
ALTER TABLE delivery_lines ADD CONSTRAINT delivery_lines_disposition_nonneg CHECK (
  accepted_qty >= 0
  AND damaged_qty >= 0
  AND missing_qty >= 0
  AND rejected_qty >= 0
  AND accepted_base_qty >= 0
  AND damaged_base_qty >= 0
  AND missing_base_qty >= 0
  AND rejected_base_qty >= 0
);

ALTER TABLE delivery_lines DROP CONSTRAINT IF EXISTS delivery_lines_disposition_positive;
ALTER TABLE delivery_lines ADD CONSTRAINT delivery_lines_disposition_positive CHECK (
  accepted_base_qty + damaged_base_qty + missing_base_qty + rejected_base_qty > 0
);

-- Keep legacy received_* columns aligned when the table still uses plain columns (not GENERATED).
CREATE OR REPLACE FUNCTION delivery_lines_sync_legacy_received_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'inventory_pro'
      AND c.table_name = 'delivery_lines'
      AND c.column_name = 'received_qty'
      AND c.is_generated = 'NEVER'
  )
  THEN
    NEW.received_qty :=
      NEW.accepted_qty + NEW.damaged_qty + NEW.missing_qty + NEW.rejected_qty;
    NEW.received_base_qty :=
      NEW.accepted_base_qty + NEW.damaged_base_qty + NEW.missing_base_qty + NEW.rejected_base_qty;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_delivery_lines_sync_received ON delivery_lines;
CREATE TRIGGER tr_delivery_lines_sync_received
BEFORE INSERT OR UPDATE ON delivery_lines
FOR EACH ROW EXECUTE FUNCTION delivery_lines_sync_legacy_received_totals();

COMMENT ON COLUMN delivery_lines.received_qty IS
  'Legacy physical column, if present: mirror sum of disposition qty; prefer GENERATED or trigger sync.';
COMMENT ON COLUMN delivery_lines.received_base_qty IS
  'Legacy physical column, if present: mirror sum of disposition base qty.';

CREATE OR REPLACE VIEW v_product_incoming_open_po_base AS
SELECT
  pol.product_id,
  coalesce(sum(pol.open_base_qty), 0)::numeric(18, 6) AS incoming_open_base_qty
FROM purchase_order_lines pol
JOIN purchase_orders po ON po.id = pol.purchase_order_id
WHERE po.deleted_at IS NULL
  AND pol.deleted_at IS NULL
  AND po.status NOT IN ('received', 'cancelled')
GROUP BY pol.product_id;

COMMENT ON VIEW v_product_incoming_open_po_base IS
  'Sellable incoming from open purchase orders: sum of open_base_qty per product.';
