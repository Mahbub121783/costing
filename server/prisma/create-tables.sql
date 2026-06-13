-- GCS Database Schema — generated from schema.prisma
-- Idempotent: safe to run multiple times.

-- ── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANDISER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CostingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CmMode" AS ENUM ('SMV_BASED', 'DIRECT_RATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FreightMode" AS ENUM ('SEA', 'AIR', 'ROAD', 'COURIER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FreightUnit" AS ENUM ('PER_CBM', 'PER_KG', 'PER_PIECE', 'LUMP_SUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TABLES ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
  "id"            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          VARCHAR(100) NOT NULL,
  "email"         VARCHAR(255) NOT NULL UNIQUE,
  "password_hash" VARCHAR(255) NOT NULL,
  "role"          "UserRole"   NOT NULL DEFAULT 'MERCHANDISER',
  "is_active"     BOOLEAN      NOT NULL DEFAULT true,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID         NOT NULL,
  "token"      VARCHAR(512) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ  NOT NULL,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");

CREATE TABLE IF NOT EXISTS "buyers" (
  "id"           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         VARCHAR(200) NOT NULL UNIQUE,
  "country"      VARCHAR(100),
  "contact_name" VARCHAR(100),
  "email"        VARCHAR(255),
  "is_active"    BOOLEAN      NOT NULL DEFAULT true,
  "created_by"   UUID         NOT NULL,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "buyers_name_idx" ON "buyers" ("name");

CREATE TABLE IF NOT EXISTS "factories" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       VARCHAR(200) NOT NULL UNIQUE,
  "country"    VARCHAR(100),
  "address"    TEXT,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_by" UUID         NOT NULL,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "factories_name_idx" ON "factories" ("name");

CREATE TABLE IF NOT EXISTS "fabric_library" (
  "id"                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                VARCHAR(200)   NOT NULL,
  "fabrication_detail"  VARCHAR(300),
  "composition"         VARCHAR(200),
  "gsm"                 DECIMAL(8,2),
  "supplier"            VARCHAR(200),
  "yarn_count"          VARCHAR(100),
  "yarn_price_per_kg"   DECIMAL(10,4),
  "spandex_price_kg"    DECIMAL(10,4),
  "spandex_percentage"  DECIMAL(5,4),
  "yarn_dyeing_cost"    DECIMAL(10,4),
  "knitting_cost"       DECIMAL(10,4),
  "dyeing_finishing"    DECIMAL(10,4),
  "aop_finishing"       DECIMAL(10,4),
  "wastage_pct"         DECIMAL(5,4),
  "is_direct_price"     BOOLEAN        NOT NULL DEFAULT false,
  "direct_price_per_kg" DECIMAL(10,4),
  "is_active"           BOOLEAN        NOT NULL DEFAULT true,
  "created_by"          UUID           NOT NULL,
  "created_at"          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "fabric_library_name_idx" ON "fabric_library" ("name");

CREATE TABLE IF NOT EXISTS "trim_library" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       VARCHAR(200) NOT NULL,
  "category"   VARCHAR(100),
  "unit"       VARCHAR(50),
  "unit_price" DECIMAL(10,4),
  "supplier"   VARCHAR(200),
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_by" UUID         NOT NULL,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "trim_library_name_idx" ON "trim_library" ("name");

CREATE TABLE IF NOT EXISTS "styles" (
  "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "style_no"    VARCHAR(100) NOT NULL UNIQUE,
  "description" VARCHAR(500) NOT NULL,
  "buyer_id"    UUID,
  "factory_id"  UUID,
  "department"  VARCHAR(100),
  "category"    VARCHAR(100),
  "season"      VARCHAR(50),
  "image_url"   VARCHAR(500),
  "pack_of"     INT          NOT NULL DEFAULT 1,
  "sizes"       TEXT[]       NOT NULL DEFAULT '{}',
  "is_active"   BOOLEAN      NOT NULL DEFAULT true,
  "created_by"  UUID         NOT NULL,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "styles_style_no_idx"  ON "styles" ("style_no");
CREATE INDEX IF NOT EXISTS "styles_buyer_id_idx"  ON "styles" ("buyer_id");

CREATE TABLE IF NOT EXISTS "costings" (
  "id"            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "style_id"      UUID            NOT NULL,
  "version"       INT             NOT NULL DEFAULT 1,
  "version_label" VARCHAR(100),
  "status"        "CostingStatus" NOT NULL DEFAULT 'DRAFT',
  "from_user"     VARCHAR(100),
  "to_person"     VARCHAR(100),
  "costing_date"  DATE,
  "notes"         TEXT,
  "target_fob"    DECIMAL(10,4),
  "is_locked"     BOOLEAN         NOT NULL DEFAULT false,
  "created_by"    UUID            NOT NULL,
  "created_at"    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE ("style_id", "version")
);
CREATE INDEX IF NOT EXISTS "costings_style_id_idx" ON "costings" ("style_id");
CREATE INDEX IF NOT EXISTS "costings_status_idx"   ON "costings" ("status");

CREATE TABLE IF NOT EXISTS "costing_fabric_shells" (
  "id"                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"          UUID         NOT NULL,
  "shell_order"         INT          NOT NULL,
  "shell_name"          VARCHAR(100),
  "application"         VARCHAR(200),
  "mill"                VARCHAR(200),
  "fabrication_detail"  VARCHAR(300),
  "fabric_library_id"   UUID,
  "is_direct_price"     BOOLEAN      NOT NULL DEFAULT false,
  "yarn_count"          VARCHAR(100),
  "yarn_price_per_kg"   DECIMAL(10,4),
  "spandex_price_kg"    DECIMAL(10,4),
  "spandex_pct"         DECIMAL(5,4),
  "yarn_dyeing_cost"    DECIMAL(10,4),
  "knitting_cost"       DECIMAL(10,4),
  "dyeing_finishing"    DECIMAL(10,4),
  "aop_finishing"       DECIMAL(10,4),
  "wastage_pct"         DECIMAL(5,4),
  "direct_price_per_kg" DECIMAL(10,4),
  "fabric_price_per_kg" DECIMAL(10,4),
  "consumption_per_size" JSONB       NOT NULL DEFAULT '{}',
  "cost_per_size"       JSONB        NOT NULL DEFAULT '{}',
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "costing_fabric_shells_costing_id_idx" ON "costing_fabric_shells" ("costing_id");

CREATE TABLE IF NOT EXISTS "costing_trims" (
  "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"      UUID         NOT NULL,
  "trim_library_id" UUID,
  "item_name"       VARCHAR(200) NOT NULL,
  "category"        VARCHAR(100),
  "unit"            VARCHAR(50),
  "rate_per_unit"   DECIMAL(10,4),
  "qty_per_garment" DECIMAL(10,4),
  "is_size_specific" BOOLEAN     NOT NULL DEFAULT false,
  "cost_per_size"   JSONB        NOT NULL DEFAULT '{}',
  "sort_order"      INT          NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "costing_trims_costing_id_idx" ON "costing_trims" ("costing_id");

CREATE TABLE IF NOT EXISTS "costing_cm" (
  "id"               UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"       UUID       NOT NULL UNIQUE,
  "cm_mode"          "CmMode"   NOT NULL DEFAULT 'DIRECT_RATE',
  "smv"              DECIMAL(8,2),
  "line_efficiency"  DECIMAL(5,4),
  "worker_wage_day"  DECIMAL(10,4),
  "working_mins_day" INT        DEFAULT 480,
  "direct_cm_rate"   DECIMAL(10,4),
  "overhead_pct"     DECIMAL(5,4) DEFAULT 0,
  "compliance_pct"   DECIMAL(5,4) DEFAULT 0,
  "cm_top_per_size"    JSONB    NOT NULL DEFAULT '{}',
  "cm_bottom_per_size" JSONB    NOT NULL DEFAULT '{}',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "costing_packaging" (
  "id"           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"   UUID         NOT NULL,
  "item_name"    VARCHAR(200) NOT NULL,
  "cost_per_size" JSONB       NOT NULL DEFAULT '{}',
  "sort_order"   INT          NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "costing_packaging_costing_id_idx" ON "costing_packaging" ("costing_id");

CREATE TABLE IF NOT EXISTS "costing_embellishments" (
  "id"           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"   UUID         NOT NULL,
  "name"         VARCHAR(200) NOT NULL,
  "cost_per_size" JSONB       NOT NULL DEFAULT '{}',
  "sort_order"   INT          NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "costing_embellishments_costing_id_idx" ON "costing_embellishments" ("costing_id");

CREATE TABLE IF NOT EXISTS "costing_wash" (
  "id"           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"   UUID         NOT NULL,
  "wash_type"    VARCHAR(200) NOT NULL,
  "cost_per_size" JSONB       NOT NULL DEFAULT '{}',
  "sort_order"   INT          NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "costing_wash_costing_id_idx" ON "costing_wash" ("costing_id");

CREATE TABLE IF NOT EXISTS "costing_testing" (
  "id"           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"   UUID        NOT NULL UNIQUE,
  "cost_per_size" JSONB      NOT NULL DEFAULT '{}',
  "notes"        TEXT,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "costing_commercial" (
  "id"                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"            UUID         NOT NULL UNIQUE,
  "buying_house_comm_pct" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "factory_comm_pct"      DECIMAL(5,4) NOT NULL DEFAULT 0,
  "profit_margin_pct"     DECIMAL(5,4) NOT NULL DEFAULT 0,
  "other_charges"         JSONB        NOT NULL DEFAULT '[]',
  "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "costing_shipment" (
  "id"                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id"          UUID          NOT NULL UNIQUE,
  "order_qty_per_size"  JSONB         NOT NULL DEFAULT '{}',
  "total_qty"           INT,
  "pcs_per_carton"      INT,
  "carton_cbm"          DECIMAL(8,4),
  "carton_gw_kg"        DECIMAL(8,2),
  "freight_mode"        "FreightMode" NOT NULL DEFAULT 'SEA',
  "freight_rate_usd"    DECIMAL(10,4),
  "freight_unit"        "FreightUnit" NOT NULL DEFAULT 'PER_CBM',
  "insurance_pct"       DECIMAL(5,4)  NOT NULL DEFAULT 0,
  "import_duty_pct"     DECIMAL(5,4)  NOT NULL DEFAULT 0,
  "total_cartons"       INT,
  "total_cbm"           DECIMAL(10,4),
  "freight_per_piece"   DECIMAL(10,4),
  "landed_cost_per_size" JSONB        NOT NULL DEFAULT '{}',
  "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "costing_audit_log" (
  "id"         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "costing_id" UUID        NOT NULL,
  "changed_by" UUID        NOT NULL,
  "changed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "action"     VARCHAR(50) NOT NULL,
  "field_name" VARCHAR(100),
  "old_value"  TEXT,
  "new_value"  TEXT
);
CREATE INDEX IF NOT EXISTS "costing_audit_log_costing_id_idx" ON "costing_audit_log" ("costing_id");
CREATE INDEX IF NOT EXISTS "costing_audit_log_changed_at_idx"  ON "costing_audit_log" ("changed_at");

-- ── FOREIGN KEYS (skipped if already exist) ───────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "refresh_tokens"         ADD CONSTRAINT "refresh_tokens_user_id_fkey"                FOREIGN KEY ("user_id")          REFERENCES "users"          ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "buyers"                 ADD CONSTRAINT "buyers_created_by_fkey"                     FOREIGN KEY ("created_by")       REFERENCES "users"          ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "factories"              ADD CONSTRAINT "factories_created_by_fkey"                  FOREIGN KEY ("created_by")       REFERENCES "users"          ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "fabric_library"         ADD CONSTRAINT "fabric_library_created_by_fkey"             FOREIGN KEY ("created_by")       REFERENCES "users"          ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "trim_library"           ADD CONSTRAINT "trim_library_created_by_fkey"               FOREIGN KEY ("created_by")       REFERENCES "users"          ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "styles"                 ADD CONSTRAINT "styles_created_by_fkey"                     FOREIGN KEY ("created_by")       REFERENCES "users"          ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "styles"                 ADD CONSTRAINT "styles_buyer_id_fkey"                       FOREIGN KEY ("buyer_id")         REFERENCES "buyers"         ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "styles"                 ADD CONSTRAINT "styles_factory_id_fkey"                     FOREIGN KEY ("factory_id")       REFERENCES "factories"      ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costings"               ADD CONSTRAINT "costings_style_id_fkey"                     FOREIGN KEY ("style_id")         REFERENCES "styles"         ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costings"               ADD CONSTRAINT "costings_created_by_fkey"                   FOREIGN KEY ("created_by")       REFERENCES "users"          ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_fabric_shells"  ADD CONSTRAINT "costing_fabric_shells_costing_id_fkey"      FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_fabric_shells"  ADD CONSTRAINT "costing_fabric_shells_fabric_library_id_fkey" FOREIGN KEY ("fabric_library_id") REFERENCES "fabric_library" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_trims"          ADD CONSTRAINT "costing_trims_costing_id_fkey"              FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_trims"          ADD CONSTRAINT "costing_trims_trim_library_id_fkey"         FOREIGN KEY ("trim_library_id")  REFERENCES "trim_library"   ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_cm"             ADD CONSTRAINT "costing_cm_costing_id_fkey"                 FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_packaging"      ADD CONSTRAINT "costing_packaging_costing_id_fkey"          FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_embellishments" ADD CONSTRAINT "costing_embellishments_costing_id_fkey"     FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_wash"           ADD CONSTRAINT "costing_wash_costing_id_fkey"               FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_testing"        ADD CONSTRAINT "costing_testing_costing_id_fkey"            FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_commercial"     ADD CONSTRAINT "costing_commercial_costing_id_fkey"         FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_shipment"       ADD CONSTRAINT "costing_shipment_costing_id_fkey"           FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_audit_log"      ADD CONSTRAINT "costing_audit_log_costing_id_fkey"          FOREIGN KEY ("costing_id")       REFERENCES "costings"       ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "costing_audit_log"      ADD CONSTRAINT "costing_audit_log_changed_by_fkey"          FOREIGN KEY ("changed_by")       REFERENCES "users"          ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
