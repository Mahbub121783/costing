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

-- ── SCHEMA MIGRATIONS (idempotent column additions) ─────────────────────────

DO $$ BEGIN ALTER TABLE "users" ADD COLUMN "company" VARCHAR(200); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN "designation" VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

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

-- ── FINANCE & HR MODULE ───────────────────────────────────────────────────────

-- New Enums
DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentTerms" AS ENUM ('LC', 'TT', 'DP', 'DA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrderPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseCategory" AS ENUM ('TRANSPORT', 'UTILITY', 'OFFICE_RENT', 'SALARIES', 'MOBILE', 'FOOD_ENTERTAINMENT', 'MARKETING', 'MISCELLANEOUS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceType" AS ENUM ('COMMERCIAL', 'PROFORMA', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BonusType" AS ENUM ('EID', 'PERFORMANCE', 'INCENTIVE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequence tables for auto-ID generation
CREATE TABLE IF NOT EXISTS "employee_id_seq" (
  "year"    INT PRIMARY KEY,
  "last_no" INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "order_finance_seq" (
  "year"    INT PRIMARY KEY,
  "last_no" INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "invoice_seq" (
  "year"    INT PRIMARY KEY,
  "last_no" INT NOT NULL DEFAULT 0
);

-- Employee tables
CREATE TABLE IF NOT EXISTS "employees" (
  "id"                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  "employee_code"     VARCHAR(20)      NOT NULL UNIQUE,
  "name"              VARCHAR(200)     NOT NULL,
  "photo_url"         VARCHAR(500),
  "nid"               VARCHAR(50),
  "phone"             VARCHAR(50),
  "email"             VARCHAR(255),
  "joining_date"      DATE             NOT NULL,
  "designation"       VARCHAR(100),
  "department"        VARCHAR(100),
  "address"           TEXT,
  "emergency_contact" JSONB            NOT NULL DEFAULT '{}',
  "bank_details"      JSONB            NOT NULL DEFAULT '{}',
  "status"            "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by"        UUID             NOT NULL,
  "created_at"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "employees_employee_code_idx" ON "employees" ("employee_code");
CREATE INDEX IF NOT EXISTS "employees_department_idx"    ON "employees" ("department");
CREATE INDEX IF NOT EXISTS "employees_status_idx"        ON "employees" ("status");

CREATE TABLE IF NOT EXISTS "employee_history" (
  "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "employee_id" UUID        NOT NULL,
  "changed_by"  UUID        NOT NULL,
  "changed_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "change_type" VARCHAR(50) NOT NULL,
  "old_value"   TEXT,
  "new_value"   TEXT,
  "notes"       TEXT
);
CREATE INDEX IF NOT EXISTS "employee_history_employee_id_idx" ON "employee_history" ("employee_id");
CREATE INDEX IF NOT EXISTS "employee_history_changed_at_idx"  ON "employee_history" ("changed_at");

CREATE TABLE IF NOT EXISTS "employee_salary_structures" (
  "id"                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "employee_id"          UUID         NOT NULL,
  "effective_from"       DATE         NOT NULL,
  "basic_salary"         DECIMAL(12,2) NOT NULL,
  "house_rent"           DECIMAL(12,2) NOT NULL DEFAULT 0,
  "medical_allowance"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "transport_allowance"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "mobile_bill"          DECIMAL(12,2) NOT NULL DEFAULT 0,
  "gross_salary"         DECIMAL(12,2) NOT NULL,
  "tax_deduction"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "other_deductions"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "is_active"            BOOLEAN      NOT NULL DEFAULT true,
  "created_by"           UUID         NOT NULL,
  "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "employee_salary_structures_employee_id_idx"   ON "employee_salary_structures" ("employee_id");
CREATE INDEX IF NOT EXISTS "employee_salary_structures_effective_from_idx" ON "employee_salary_structures" ("effective_from");

CREATE TABLE IF NOT EXISTS "employee_expenses" (
  "id"             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "employee_id"    UUID        NOT NULL,
  "expense_date"   DATE        NOT NULL,
  "expense_type"   VARCHAR(50) NOT NULL,
  "bonus_type"     "BonusType",
  "amount"         DECIMAL(12,2) NOT NULL,
  "description"    TEXT,
  "month"          INT,
  "year"           INT,
  "payroll_item_id" UUID,
  "created_by"     UUID        NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "employee_expenses_employee_id_idx" ON "employee_expenses" ("employee_id");
CREATE INDEX IF NOT EXISTS "employee_expenses_expense_type_idx" ON "employee_expenses" ("expense_type");
CREATE INDEX IF NOT EXISTS "employee_expenses_month_year_idx"   ON "employee_expenses" ("month", "year");

-- Payroll tables
CREATE TABLE IF NOT EXISTS "monthly_payrolls" (
  "id"           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "month"        INT             NOT NULL,
  "year"         INT             NOT NULL,
  "status"       "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
  "total_gross"  DECIMAL(14,2)   NOT NULL DEFAULT 0,
  "total_net"    DECIMAL(14,2)   NOT NULL DEFAULT 0,
  "total_advance" DECIMAL(14,2)  NOT NULL DEFAULT 0,
  "notes"        TEXT,
  "processed_by" UUID,
  "processed_at" TIMESTAMPTZ,
  "paid_at"      TIMESTAMPTZ,
  "created_by"   UUID            NOT NULL,
  "created_at"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE ("month", "year")
);
CREATE INDEX IF NOT EXISTS "monthly_payrolls_year_month_idx" ON "monthly_payrolls" ("year", "month");

CREATE TABLE IF NOT EXISTS "payroll_items" (
  "id"                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "payroll_id"           UUID        NOT NULL,
  "employee_id"          UUID        NOT NULL,
  "basic_salary"         DECIMAL(12,2) NOT NULL,
  "house_rent"           DECIMAL(12,2) NOT NULL DEFAULT 0,
  "medical_allowance"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "transport_allowance"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "mobile_bill"          DECIMAL(12,2) NOT NULL DEFAULT 0,
  "gross_salary"         DECIMAL(12,2) NOT NULL,
  "bonus_amount"         DECIMAL(12,2) NOT NULL DEFAULT 0,
  "bonus_type"           "BonusType",
  "overtime_amount"      DECIMAL(12,2) NOT NULL DEFAULT 0,
  "advance_deduction"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_deduction"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "other_deductions"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_deductions"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_pay"              DECIMAL(12,2) NOT NULL,
  "is_paid"              BOOLEAN      NOT NULL DEFAULT false,
  "paid_at"              TIMESTAMPTZ,
  "notes"                TEXT,
  "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("payroll_id", "employee_id")
);
CREATE INDEX IF NOT EXISTS "payroll_items_payroll_id_idx"  ON "payroll_items" ("payroll_id");
CREATE INDEX IF NOT EXISTS "payroll_items_employee_id_idx" ON "payroll_items" ("employee_id");

-- Order Finance tables
CREATE TABLE IF NOT EXISTS "order_finances" (
  "id"                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_no"          VARCHAR(50)          NOT NULL UNIQUE,
  "costing_id"        UUID                 NOT NULL,
  "buyer_id"          UUID                 NOT NULL,
  "agreed_fob_per_pc" DECIMAL(10,4)        NOT NULL,
  "total_qty"         INT                  NOT NULL,
  "total_goods_value" DECIMAL(14,2)        NOT NULL,
  "currency"          VARCHAR(10)          NOT NULL DEFAULT 'USD',
  "payment_terms"     "PaymentTerms"       NOT NULL,
  "advance_pct"       DECIMAL(5,4)         NOT NULL DEFAULT 0,
  "advance_amount"    DECIMAL(14,2)        NOT NULL DEFAULT 0,
  "balance_amount"    DECIMAL(14,2)        NOT NULL DEFAULT 0,
  "payment_status"    "OrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "total_paid"        DECIMAL(14,2)        NOT NULL DEFAULT 0,
  "shipment_date"     DATE,
  "delivery_date"     DATE,
  "notes"             TEXT,
  "created_by"        UUID                 NOT NULL,
  "created_at"        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "order_finances_costing_id_idx"     ON "order_finances" ("costing_id");
CREATE INDEX IF NOT EXISTS "order_finances_buyer_id_idx"       ON "order_finances" ("buyer_id");
CREATE INDEX IF NOT EXISTS "order_finances_payment_status_idx" ON "order_finances" ("payment_status");

CREATE TABLE IF NOT EXISTS "order_payments" (
  "id"                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_finance_id"  UUID        NOT NULL,
  "payment_date"      DATE        NOT NULL,
  "amount"            DECIMAL(14,2) NOT NULL,
  "payment_method"    VARCHAR(50) NOT NULL,
  "bank_reference"    VARCHAR(200),
  "notes"             TEXT,
  "created_by"        UUID        NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "order_payments_order_finance_id_idx" ON "order_payments" ("order_finance_id");
CREATE INDEX IF NOT EXISTS "order_payments_payment_date_idx"     ON "order_payments" ("payment_date");

-- Business Expenses table
CREATE TABLE IF NOT EXISTS "business_expenses" (
  "id"                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  "expense_date"         DATE              NOT NULL,
  "category"             "ExpenseCategory" NOT NULL,
  "description"          TEXT              NOT NULL,
  "amount"               DECIMAL(12,2)     NOT NULL,
  "payment_method"       VARCHAR(50),
  "receipt_url"          VARCHAR(500),
  "is_recurring"         BOOLEAN           NOT NULL DEFAULT false,
  "recurring_day"        INT,
  "status"               "ExpenseStatus"   NOT NULL DEFAULT 'PENDING',
  "paid_at"              TIMESTAMPTZ,
  "approved_by"          UUID,
  "approved_at"          TIMESTAMPTZ,
  "month"                INT,
  "year"                 INT,
  "created_by"           UUID              NOT NULL,
  "created_at"           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "business_expenses_category_idx"   ON "business_expenses" ("category");
CREATE INDEX IF NOT EXISTS "business_expenses_status_idx"     ON "business_expenses" ("status");
CREATE INDEX IF NOT EXISTS "business_expenses_date_idx"       ON "business_expenses" ("expense_date");
CREATE INDEX IF NOT EXISTS "business_expenses_month_year_idx" ON "business_expenses" ("month", "year");

-- Invoice tables
CREATE TABLE IF NOT EXISTS "invoices" (
  "id"                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_no"              VARCHAR(20)     NOT NULL UNIQUE,
  "invoice_type"            "InvoiceType"   NOT NULL,
  "invoice_date"            DATE            NOT NULL,
  "order_finance_id"        UUID,
  "buyer_id"                UUID,
  "buyer_name"              VARCHAR(200),
  "buyer_address"           TEXT,
  "subtotal"                DECIMAL(14,2)   NOT NULL DEFAULT 0,
  "additional_charges"      DECIMAL(14,2)   NOT NULL DEFAULT 0,
  "additional_charges_note" VARCHAR(200),
  "grand_total"             DECIMAL(14,2)   NOT NULL DEFAULT 0,
  "currency"                VARCHAR(10)     NOT NULL DEFAULT 'USD',
  "status"                  "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "due_date"                DATE,
  "paid_at"                 TIMESTAMPTZ,
  "notes"                   TEXT,
  "created_by"              UUID            NOT NULL,
  "created_at"              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "invoices_invoice_type_idx"     ON "invoices" ("invoice_type");
CREATE INDEX IF NOT EXISTS "invoices_status_idx"           ON "invoices" ("status");
CREATE INDEX IF NOT EXISTS "invoices_buyer_id_idx"         ON "invoices" ("buyer_id");
CREATE INDEX IF NOT EXISTS "invoices_order_finance_id_idx" ON "invoices" ("order_finance_id");

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id"          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id"  UUID          NOT NULL,
  "description" VARCHAR(500)  NOT NULL,
  "quantity"    DECIMAL(12,3) NOT NULL,
  "unit_price"  DECIMAL(10,4) NOT NULL,
  "total_price" DECIMAL(14,2) NOT NULL,
  "sort_order"  INT           NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items" ("invoice_id");

-- ── FINANCE & HR FOREIGN KEYS ─────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_history" ADD CONSTRAINT "employee_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "employee_history" ADD CONSTRAINT "employee_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_expenses" ADD CONSTRAINT "employee_expenses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "employee_expenses" ADD CONSTRAINT "employee_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "employee_expenses" ADD CONSTRAINT "employee_expenses_payroll_item_id_fkey" FOREIGN KEY ("payroll_item_id") REFERENCES "payroll_items" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "monthly_payrolls" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "order_finances" ADD CONSTRAINT "order_finances_costing_id_fkey" FOREIGN KEY ("costing_id") REFERENCES "costings" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "order_finances" ADD CONSTRAINT "order_finances_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "order_finances" ADD CONSTRAINT "order_finances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_finance_id_fkey" FOREIGN KEY ("order_finance_id") REFERENCES "order_finances" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_finance_id_fkey" FOREIGN KEY ("order_finance_id") REFERENCES "order_finances" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
