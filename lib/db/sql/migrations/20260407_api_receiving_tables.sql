-- Receiving workflow tables for @workspace/api-server (public schema, Drizzle).
-- Apply with: psql $DATABASE_URL -f this_file.sql

CREATE TYPE purchase_order_status AS ENUM (
  'draft',
  'approved',
  'partially_received',
  'received',
  'cancelled'
);

CREATE TYPE delivery_status AS ENUM ('draft', 'posted', 'voided');

CREATE TYPE ledger_txn_type AS ENUM ('receipt');

CREATE TYPE ledger_source_doc AS ENUM ('delivery', 'delivery_line', 'manual');

CREATE TABLE stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers (id),
  status purchase_order_status NOT NULL DEFAULT 'draft',
  order_date date NOT NULL,
  expected_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  product_id uuid NOT NULL REFERENCES products (id),
  ordered_base_qty integer NOT NULL,
  open_base_qty integer NOT NULL,
  unit_price text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_order_id, line_no)
);

CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers (id),
  purchase_order_id uuid REFERENCES purchase_orders (id),
  status delivery_status NOT NULL DEFAULT 'draft',
  received_at timestamptz NOT NULL,
  received_by_user_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries (id) ON DELETE CASCADE,
  po_line_id uuid REFERENCES purchase_order_lines (id),
  product_id uuid NOT NULL REFERENCES products (id),
  location_id uuid NOT NULL REFERENCES stock_locations (id),
  accepted_qty integer NOT NULL DEFAULT 0,
  damaged_qty integer NOT NULL DEFAULT 0,
  missing_qty integer NOT NULL DEFAULT 0,
  rejected_qty integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_type ledger_txn_type NOT NULL,
  source_doc_type ledger_source_doc NOT NULL,
  source_doc_id uuid NOT NULL,
  txn_time timestamptz NOT NULL,
  performed_by_user_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_transaction_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_transaction_id uuid NOT NULL REFERENCES stock_transactions (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products (id),
  location_id uuid NOT NULL REFERENCES stock_locations (id),
  delta_base_qty integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
