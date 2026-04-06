-- Hardware Inventory Pro - robust inventory data model
-- PostgreSQL 14+ compatible
--
-- Core principles:
-- 1) Every product has one base unit, and all stock math uses base units only.
-- 2) Document lines preserve original units (purchase/sell/etc.) plus converted base qty.
-- 3) Stock ledger is append-only; corrections happen with compensating entries.
-- 4) Mutable business tables include row_version + deleted_at for offline-first sync.

CREATE SCHEMA IF NOT EXISTS inventory_pro;
SET search_path TO inventory_pro, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE unit_dimension AS ENUM ('count', 'mass', 'length', 'volume', 'package', 'other');
CREATE TYPE product_unit_role AS ENUM ('purchase', 'stock', 'sell');
CREATE TYPE rounding_mode AS ENUM ('HALF_UP', 'HALF_DOWN', 'UP', 'DOWN');
CREATE TYPE po_status AS ENUM ('draft', 'approved', 'partially_received', 'received', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('draft', 'posted', 'voided');
CREATE TYPE transaction_type AS ENUM (
  'receipt',
  'sale',
  'adjustment',
  'transfer',
  'purchase_return',
  'customer_return',
  'count_variance'
);
CREATE TYPE source_doc_type AS ENUM (
  'manual',
  'delivery_line',
  'sale_line',
  'transfer_line',
  'adjustment_line',
  'count_line'
);
CREATE TYPE sync_op_type AS ENUM ('insert', 'update', 'delete');

-- =========================
-- GENERIC TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION set_row_version_and_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.row_version = COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION forbid_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. Use compensating transactions instead.', TG_TABLE_NAME;
END;
$$;

-- =========================
-- SYNC + REFERENCE
-- =========================
CREATE TABLE sync_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code text NOT NULL UNIQUE,
  device_name text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,   -- kg, bag, pc, box, m, roll
  name text NOT NULL,
  dimension unit_dimension NOT NULL,
  decimal_places smallint NOT NULL DEFAULT 0 CHECK (decimal_places >= 0 AND decimal_places <= 6),
  is_active boolean NOT NULL DEFAULT true,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TRIGGER tr_units_set_version
BEFORE UPDATE ON units
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'warehouse',
  parent_location_id uuid REFERENCES stock_locations(id),
  is_active boolean NOT NULL DEFAULT true,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TRIGGER tr_stock_locations_set_version
BEFORE UPDATE ON stock_locations
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

-- =========================
-- PRODUCTS + CONVERSIONS
-- =========================
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  base_unit_id uuid NOT NULL REFERENCES units(id),
  is_active boolean NOT NULL DEFAULT true,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TRIGGER tr_products_set_version
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE product_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  unit_id uuid NOT NULL REFERENCES units(id),
  role product_unit_role NOT NULL,
  is_default_for_role boolean NOT NULL DEFAULT false,
  min_qty numeric(18, 6),
  max_qty numeric(18, 6),
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT uq_product_units UNIQUE (product_id, unit_id, role),
  CONSTRAINT chk_product_units_range CHECK (
    (min_qty IS NULL OR min_qty >= 0) AND
    (max_qty IS NULL OR max_qty >= 0) AND
    (min_qty IS NULL OR max_qty IS NULL OR min_qty <= max_qty)
  )
);
CREATE TRIGGER tr_product_units_set_version
BEFORE UPDATE ON product_units
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE UNIQUE INDEX uq_product_units_default_role
ON product_units (product_id, role)
WHERE is_default_for_role = true AND deleted_at IS NULL;

CREATE TABLE product_unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  from_unit_id uuid NOT NULL REFERENCES units(id),
  to_unit_id uuid NOT NULL REFERENCES units(id),
  factor_num numeric(18, 6) NOT NULL CHECK (factor_num > 0),
  factor_den numeric(18, 6) NOT NULL DEFAULT 1 CHECK (factor_den > 0),
  rounding_mode rounding_mode NOT NULL DEFAULT 'HALF_UP',
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_product_unit_conversion_not_same_unit CHECK (from_unit_id <> to_unit_id),
  CONSTRAINT chk_product_unit_conversion_window CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE TRIGGER tr_product_unit_conversions_set_version
BEFORE UPDATE ON product_unit_conversions
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE UNIQUE INDEX uq_active_product_conversion
ON product_unit_conversions (product_id, from_unit_id, to_unit_id, effective_from)
WHERE deleted_at IS NULL;

-- =========================
-- SUPPLIERS + PROCUREMENT
-- =========================
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text UNIQUE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  payment_terms text,
  is_active boolean NOT NULL DEFAULT true,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TRIGGER tr_suppliers_set_version
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  product_id uuid NOT NULL REFERENCES products(id),
  supplier_sku text,
  purchase_unit_id uuid REFERENCES units(id),
  lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  last_price numeric(14, 4),
  currency_code char(3) DEFAULT 'USD',
  is_preferred boolean NOT NULL DEFAULT false,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT uq_supplier_product UNIQUE (supplier_id, product_id)
);
CREATE TRIGGER tr_supplier_products_set_version
BEFORE UPDATE ON supplier_products
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  status po_status NOT NULL DEFAULT 'draft',
  order_date date NOT NULL,
  expected_date date,
  created_by_user_id uuid REFERENCES app_users(id),
  notes text,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TRIGGER tr_purchase_orders_set_version
BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  line_no integer NOT NULL CHECK (line_no > 0),
  product_id uuid NOT NULL REFERENCES products(id),
  ordered_qty numeric(18, 6) NOT NULL CHECK (ordered_qty > 0),
  ordered_unit_id uuid NOT NULL REFERENCES units(id),
  ordered_base_qty numeric(18, 6) NOT NULL CHECK (ordered_base_qty > 0),
  open_base_qty numeric(18, 6) NOT NULL CHECK (open_base_qty >= 0),
  unit_price numeric(14, 4),
  tax_rate numeric(7, 4),
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT uq_purchase_order_line_no UNIQUE (purchase_order_id, line_no)
);
CREATE TRIGGER tr_purchase_order_lines_set_version
BEFORE UPDATE ON purchase_order_lines
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  status delivery_status NOT NULL DEFAULT 'draft',
  received_at timestamptz NOT NULL,
  received_by_user_id uuid REFERENCES app_users(id),
  notes text,
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TRIGGER tr_deliveries_set_version
BEFORE UPDATE ON deliveries
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE delivery_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  po_line_id uuid REFERENCES purchase_order_lines(id),
  product_id uuid NOT NULL REFERENCES products(id),
  location_id uuid NOT NULL REFERENCES stock_locations(id),
  received_qty numeric(18, 6) NOT NULL CHECK (received_qty > 0),
  received_unit_id uuid NOT NULL REFERENCES units(id),
  received_base_qty numeric(18, 6) NOT NULL CHECK (received_base_qty > 0),
  unit_cost_base numeric(14, 6),
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TRIGGER tr_delivery_lines_set_version
BEFORE UPDATE ON delivery_lines
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

-- =========================
-- STOCK POLICY + LEDGER
-- =========================
CREATE TABLE inventory_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  location_id uuid NOT NULL REFERENCES stock_locations(id),
  low_stock_threshold_base_qty numeric(18, 6) NOT NULL DEFAULT 0 CHECK (low_stock_threshold_base_qty >= 0),
  reorder_point_base_qty numeric(18, 6) NOT NULL DEFAULT 0 CHECK (reorder_point_base_qty >= 0),
  safety_stock_base_qty numeric(18, 6) NOT NULL DEFAULT 0 CHECK (safety_stock_base_qty >= 0),
  reorder_qty_base_qty numeric(18, 6) CHECK (reorder_qty_base_qty IS NULL OR reorder_qty_base_qty > 0),
  row_version bigint NOT NULL DEFAULT 0,
  last_modified_by_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT uq_inventory_policy UNIQUE (product_id, location_id),
  CONSTRAINT chk_inventory_policy_order CHECK (reorder_point_base_qty >= safety_stock_base_qty)
);
CREATE TRIGGER tr_inventory_policies_set_version
BEFORE UPDATE ON inventory_policies
FOR EACH ROW EXECUTE FUNCTION set_row_version_and_updated_at();

CREATE TABLE stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_type transaction_type NOT NULL,
  source_doc_type source_doc_type NOT NULL DEFAULT 'manual',
  source_doc_id uuid,
  txn_time timestamptz NOT NULL,
  performed_by_user_id uuid REFERENCES app_users(id),
  device_id uuid REFERENCES sync_devices(id),
  idempotency_key text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_transaction_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_transaction_id uuid NOT NULL REFERENCES stock_transactions(id),
  product_id uuid NOT NULL REFERENCES products(id),
  location_id uuid NOT NULL REFERENCES stock_locations(id),
  delta_base_qty numeric(18, 6) NOT NULL CHECK (delta_base_qty <> 0),
  balance_after_base_qty numeric(18, 6),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_txn_lines_product_location_time
ON stock_transaction_lines (product_id, location_id, created_at);

-- Materialized read model; can be rebuilt from stock_transaction_lines.
CREATE TABLE inventory_balances (
  product_id uuid NOT NULL REFERENCES products(id),
  location_id uuid NOT NULL REFERENCES stock_locations(id),
  on_hand_base_qty numeric(18, 6) NOT NULL DEFAULT 0,
  reserved_base_qty numeric(18, 6) NOT NULL DEFAULT 0,
  available_base_qty numeric(18, 6) GENERATED ALWAYS AS (on_hand_base_qty - reserved_base_qty) STORED,
  last_txn_line_id uuid REFERENCES stock_transaction_lines(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, location_id),
  CONSTRAINT chk_balance_nonnegative_reserved CHECK (reserved_base_qty >= 0)
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  changed_fields_json jsonb,
  before_json jsonb,
  after_json jsonb,
  changed_by_user_id uuid REFERENCES app_users(id),
  device_id uuid REFERENCES sync_devices(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity_time ON audit_log (entity_type, entity_id, changed_at DESC);

CREATE TABLE sync_change_log (
  seq_no bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  op_type sync_op_type NOT NULL,
  payload_json jsonb NOT NULL,
  origin_device_id uuid REFERENCES sync_devices(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_change_log_entity ON sync_change_log (entity_type, entity_id, seq_no DESC);

-- Enforce immutability of the stock ledger.
CREATE TRIGGER tr_block_stock_transactions_mutation
BEFORE UPDATE OR DELETE ON stock_transactions
FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();

CREATE TRIGGER tr_block_stock_transaction_lines_mutation
BEFORE UPDATE OR DELETE ON stock_transaction_lines
FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();

-- =========================
-- EXAMPLE DATA
-- cement, nails, electrical wire
-- =========================
INSERT INTO sync_devices (device_code, device_name)
VALUES ('server-01', 'Primary API Server')
ON CONFLICT (device_code) DO NOTHING;

INSERT INTO app_users (username, display_name)
VALUES ('system', 'System User')
ON CONFLICT (username) DO NOTHING;

INSERT INTO units (code, name, dimension, decimal_places)
VALUES
  ('kg', 'Kilogram', 'mass', 3),
  ('bag', 'Bag', 'package', 0),
  ('pc', 'Piece', 'count', 0),
  ('box', 'Box', 'package', 0),
  ('m', 'Meter', 'length', 2),
  ('roll', 'Roll', 'package', 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO stock_locations (code, name, location_type)
VALUES ('WH-A', 'Main Warehouse A', 'warehouse')
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (sku, name, base_unit_id)
SELECT 'CEM-OPC-50', 'Cement OPC 50', u.id FROM units u WHERE u.code = 'kg'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (sku, name, base_unit_id)
SELECT 'NAIL-2IN', 'Nails 2in', u.id FROM units u WHERE u.code = 'pc'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (sku, name, base_unit_id)
SELECT 'WIRE-2P5', 'Electrical Wire 2.5mm', u.id FROM units u WHERE u.code = 'm'
ON CONFLICT (sku) DO NOTHING;

-- Product role units
INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'purchase', true
FROM products p
JOIN units u ON u.code = 'bag'
WHERE p.sku = 'CEM-OPC-50'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'stock', true
FROM products p
JOIN units u ON u.code = 'kg'
WHERE p.sku = 'CEM-OPC-50'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'sell', true
FROM products p
JOIN units u ON u.code = 'kg'
WHERE p.sku = 'CEM-OPC-50'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'sell', false
FROM products p
JOIN units u ON u.code = 'bag'
WHERE p.sku = 'CEM-OPC-50'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'purchase', true
FROM products p
JOIN units u ON u.code = 'box'
WHERE p.sku = 'NAIL-2IN'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'stock', true
FROM products p
JOIN units u ON u.code = 'pc'
WHERE p.sku = 'NAIL-2IN'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'sell', true
FROM products p
JOIN units u ON u.code = 'pc'
WHERE p.sku = 'NAIL-2IN'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'sell', false
FROM products p
JOIN units u ON u.code = 'box'
WHERE p.sku = 'NAIL-2IN'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'purchase', true
FROM products p
JOIN units u ON u.code = 'roll'
WHERE p.sku = 'WIRE-2P5'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'stock', true
FROM products p
JOIN units u ON u.code = 'm'
WHERE p.sku = 'WIRE-2P5'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'sell', true
FROM products p
JOIN units u ON u.code = 'm'
WHERE p.sku = 'WIRE-2P5'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

INSERT INTO product_units (product_id, unit_id, role, is_default_for_role)
SELECT p.id, u.id, 'sell', false
FROM products p
JOIN units u ON u.code = 'roll'
WHERE p.sku = 'WIRE-2P5'
ON CONFLICT (product_id, unit_id, role) DO NOTHING;

-- Product-specific conversions
-- Cement: 1 bag = 50 kg
INSERT INTO product_unit_conversions (
  product_id, from_unit_id, to_unit_id, factor_num, factor_den, rounding_mode, effective_from
)
SELECT p.id, u_from.id, u_to.id, 50, 1, 'HALF_UP', '2026-01-01 00:00:00+00'
FROM products p
JOIN units u_from ON u_from.code = 'bag'
JOIN units u_to ON u_to.code = 'kg'
WHERE p.sku = 'CEM-OPC-50'
ON CONFLICT (product_id, from_unit_id, to_unit_id, effective_from) DO NOTHING;

-- Nails: 1 box = 1000 pc
INSERT INTO product_unit_conversions (
  product_id, from_unit_id, to_unit_id, factor_num, factor_den, rounding_mode, effective_from
)
SELECT p.id, u_from.id, u_to.id, 1000, 1, 'HALF_UP', '2026-01-01 00:00:00+00'
FROM products p
JOIN units u_from ON u_from.code = 'box'
JOIN units u_to ON u_to.code = 'pc'
WHERE p.sku = 'NAIL-2IN'
ON CONFLICT (product_id, from_unit_id, to_unit_id, effective_from) DO NOTHING;

-- Wire: 1 roll = 90 m
INSERT INTO product_unit_conversions (
  product_id, from_unit_id, to_unit_id, factor_num, factor_den, rounding_mode, effective_from
)
SELECT p.id, u_from.id, u_to.id, 90, 1, 'HALF_UP', '2026-01-01 00:00:00+00'
FROM products p
JOIN units u_from ON u_from.code = 'roll'
JOIN units u_to ON u_to.code = 'm'
WHERE p.sku = 'WIRE-2P5'
ON CONFLICT (product_id, from_unit_id, to_unit_id, effective_from) DO NOTHING;

-- Inventory policies (WH-A)
INSERT INTO inventory_policies (
  product_id,
  location_id,
  low_stock_threshold_base_qty,
  reorder_point_base_qty,
  safety_stock_base_qty,
  reorder_qty_base_qty
)
SELECT p.id, l.id, 400, 800, 200, 2000
FROM products p
JOIN stock_locations l ON l.code = 'WH-A'
WHERE p.sku = 'CEM-OPC-50'
ON CONFLICT (product_id, location_id) DO NOTHING;

INSERT INTO inventory_policies (
  product_id,
  location_id,
  low_stock_threshold_base_qty,
  reorder_point_base_qty,
  safety_stock_base_qty,
  reorder_qty_base_qty
)
SELECT p.id, l.id, 10000, 20000, 5000, 50000
FROM products p
JOIN stock_locations l ON l.code = 'WH-A'
WHERE p.sku = 'NAIL-2IN'
ON CONFLICT (product_id, location_id) DO NOTHING;

INSERT INTO inventory_policies (
  product_id,
  location_id,
  low_stock_threshold_base_qty,
  reorder_point_base_qty,
  safety_stock_base_qty,
  reorder_qty_base_qty
)
SELECT p.id, l.id, 300, 600, 150, 1800
FROM products p
JOIN stock_locations l ON l.code = 'WH-A'
WHERE p.sku = 'WIRE-2P5'
ON CONFLICT (product_id, location_id) DO NOTHING;

-- Supplier and procurement examples
INSERT INTO suppliers (supplier_code, name, contact_name, phone, email, payment_terms)
VALUES
  ('SUP-BUILDMAX', 'BuildMax', 'Rahul Singh', '+1-555-1001', 'orders@buildmax.example', 'Net 30'),
  ('SUP-FIXFAST', 'FixFast Metals', 'Anna Cruz', '+1-555-1002', 'sales@fixfast.example', 'Net 15'),
  ('SUP-ELECTRO', 'ElectroHub', 'Mina Kato', '+1-555-1003', 'supply@electrohub.example', 'Net 30')
ON CONFLICT (supplier_code) DO NOTHING;

INSERT INTO supplier_products (supplier_id, product_id, supplier_sku, purchase_unit_id, lead_time_days, last_price, currency_code, is_preferred)
SELECT s.id, p.id, 'CEM-BAG-50', u.id, 3, 6.75, 'USD', true
FROM suppliers s
JOIN products p ON p.sku = 'CEM-OPC-50'
JOIN units u ON u.code = 'bag'
WHERE s.supplier_code = 'SUP-BUILDMAX'
ON CONFLICT (supplier_id, product_id) DO NOTHING;

INSERT INTO supplier_products (supplier_id, product_id, supplier_sku, purchase_unit_id, lead_time_days, last_price, currency_code, is_preferred)
SELECT s.id, p.id, 'NAIL-2IN-BOX1K', u.id, 5, 18.90, 'USD', true
FROM suppliers s
JOIN products p ON p.sku = 'NAIL-2IN'
JOIN units u ON u.code = 'box'
WHERE s.supplier_code = 'SUP-FIXFAST'
ON CONFLICT (supplier_id, product_id) DO NOTHING;

INSERT INTO supplier_products (supplier_id, product_id, supplier_sku, purchase_unit_id, lead_time_days, last_price, currency_code, is_preferred)
SELECT s.id, p.id, 'WIRE-2P5-ROLL90', u.id, 4, 29.50, 'USD', true
FROM suppliers s
JOIN products p ON p.sku = 'WIRE-2P5'
JOIN units u ON u.code = 'roll'
WHERE s.supplier_code = 'SUP-ELECTRO'
ON CONFLICT (supplier_id, product_id) DO NOTHING;

-- Purchase order + delivery + stock ledger sample for cement
INSERT INTO purchase_orders (po_number, supplier_id, status, order_date, expected_date, notes)
SELECT 'PO-1001', s.id, 'approved', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 day', 'Cement replenishment'
FROM suppliers s
WHERE s.supplier_code = 'SUP-BUILDMAX'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_order_lines (
  purchase_order_id, line_no, product_id, ordered_qty, ordered_unit_id, ordered_base_qty, open_base_qty, unit_price
)
SELECT po.id, 1, p.id, 200, u_bag.id, 10000, 10000, 6.75
FROM purchase_orders po
JOIN products p ON p.sku = 'CEM-OPC-50'
JOIN units u_bag ON u_bag.code = 'bag'
WHERE po.po_number = 'PO-1001'
ON CONFLICT (purchase_order_id, line_no) DO NOTHING;

INSERT INTO deliveries (delivery_number, supplier_id, purchase_order_id, status, received_at, notes)
SELECT 'D-9001', s.id, po.id, 'posted', now(), 'Partial receipt: 120 bags'
FROM suppliers s
JOIN purchase_orders po ON po.po_number = 'PO-1001'
WHERE s.supplier_code = 'SUP-BUILDMAX'
ON CONFLICT (delivery_number) DO NOTHING;

INSERT INTO delivery_lines (
  delivery_id, po_line_id, product_id, location_id, received_qty, received_unit_id, received_base_qty, unit_cost_base
)
SELECT d.id, pol.id, p.id, l.id, 120, u_bag.id, 6000, 0.135
FROM deliveries d
JOIN purchase_orders po ON po.id = d.purchase_order_id
JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id AND pol.line_no = 1
JOIN products p ON p.id = pol.product_id
JOIN stock_locations l ON l.code = 'WH-A'
JOIN units u_bag ON u_bag.code = 'bag'
WHERE d.delivery_number = 'D-9001'
AND NOT EXISTS (
  SELECT 1
  FROM delivery_lines dl
  WHERE dl.delivery_id = d.id
    AND dl.po_line_id = pol.id
    AND dl.product_id = p.id
    AND dl.location_id = l.id
    AND dl.received_base_qty = 6000
);

INSERT INTO stock_transactions (txn_type, source_doc_type, source_doc_id, txn_time, idempotency_key, notes)
SELECT 'receipt', 'delivery_line', dl.id, now(), 'txn-delivery-d9001-line1', 'Receipt from D-9001'
FROM delivery_lines dl
JOIN deliveries d ON d.id = dl.delivery_id
WHERE d.delivery_number = 'D-9001'
LIMIT 1
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO stock_transaction_lines (stock_transaction_id, product_id, location_id, delta_base_qty, balance_after_base_qty, note)
SELECT st.id, p.id, l.id, 6000, NULL, 'Cement receipt: 120 bag => 6000 kg'
FROM stock_transactions st
JOIN products p ON p.sku = 'CEM-OPC-50'
JOIN stock_locations l ON l.code = 'WH-A'
WHERE st.idempotency_key = 'txn-delivery-d9001-line1'
AND NOT EXISTS (
  SELECT 1
  FROM stock_transaction_lines stl
  WHERE stl.stock_transaction_id = st.id
    AND stl.product_id = p.id
    AND stl.location_id = l.id
    AND stl.delta_base_qty = 6000
    AND stl.note = 'Cement receipt: 120 bag => 6000 kg'
);

-- Example outgoing sale movement from same stock
INSERT INTO stock_transactions (txn_type, source_doc_type, txn_time, idempotency_key, notes)
VALUES ('sale', 'manual', now(), 'txn-sale-cement-001', 'Sold 250 kg cement')
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO stock_transaction_lines (stock_transaction_id, product_id, location_id, delta_base_qty, balance_after_base_qty, note)
SELECT st.id, p.id, l.id, -250, NULL, 'Cement sale in base unit'
FROM stock_transactions st
JOIN products p ON p.sku = 'CEM-OPC-50'
JOIN stock_locations l ON l.code = 'WH-A'
WHERE st.idempotency_key = 'txn-sale-cement-001'
AND NOT EXISTS (
  SELECT 1
  FROM stock_transaction_lines stl
  WHERE stl.stock_transaction_id = st.id
    AND stl.product_id = p.id
    AND stl.location_id = l.id
    AND stl.delta_base_qty = -250
    AND stl.note = 'Cement sale in base unit'
);
