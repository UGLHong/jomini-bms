ALTER TABLE "supplier"
  ADD COLUMN IF NOT EXISTS "api_config" jsonb DEFAULT '{"kind":"none"}'::jsonb,
  ADD COLUMN IF NOT EXISTS "api_key" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_submission" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" varchar(12) NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
  "supplier_key" text NOT NULL REFERENCES "supplier"("key") ON DELETE RESTRICT,
  "product_id" uuid REFERENCES "product"("id") ON DELETE SET NULL,
  "idtrx" text NOT NULL,
  "service_id" text NOT NULL,
  "target" text NOT NULL,
  "contact" text NOT NULL DEFAULT '',
  "external_invoice" text,
  "status" text NOT NULL DEFAULT 'pending',
  "attempts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "request" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_response" jsonb DEFAULT '{}'::jsonb,
  "last_checked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_submission_idtrx_idx"
  ON "supplier_submission" ("supplier_key", "idtrx");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_submission_order_idx"
  ON "supplier_submission" ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_submission_status_idx"
  ON "supplier_submission" ("status");
