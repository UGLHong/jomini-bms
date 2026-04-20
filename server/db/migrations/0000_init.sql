CREATE TABLE "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "external_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(12) NOT NULL,
	"user_id" varchar(128) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"response_path" text DEFAULT '' NOT NULL,
	"order_id" varchar(12),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "external_link_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "game" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"icon_url" text,
	"game_id_format" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"currency_label" text DEFAULT 'Diamonds' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_game" (
	"supplier_key" text NOT NULL,
	"game_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "supplier_game_supplier_key_game_key_pk" PRIMARY KEY("supplier_key","game_key")
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"relay_channel" text,
	"telegram_group_id" text,
	"telegram_mentions" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_key" text NOT NULL,
	"supplier_key" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"combination" text DEFAULT '' NOT NULL,
	"is_base_amount" boolean DEFAULT true NOT NULL,
	"cost" numeric(12, 4) DEFAULT '0' NOT NULL,
	"selling" numeric(12, 4) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"game_key" text PRIMARY KEY NOT NULL,
	"remaining_stock" numeric(18, 4) DEFAULT '0' NOT NULL,
	"out_of_stock_threshold" integer DEFAULT 0 NOT NULL,
	"stock_available" boolean DEFAULT true NOT NULL,
	"restock_at" timestamp with time zone,
	"custom" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone,
	"process_at" timestamp with time zone,
	"user_id" varchar(128) DEFAULT '' NOT NULL,
	"ign" text DEFAULT '' NOT NULL,
	"fullname" text DEFAULT '' NOT NULL,
	"gender" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"game_key" text NOT NULL,
	"game_id" text DEFAULT '' NOT NULL,
	"buy_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 4) DEFAULT '0' NOT NULL,
	"cost_price" numeric(12, 4) DEFAULT '0' NOT NULL,
	"profit" numeric(12, 4) DEFAULT '0' NOT NULL,
	"receipt_url" text DEFAULT '' NOT NULL,
	"process_successful" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"process_pending" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"process_failed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"process_status" text DEFAULT 'open' NOT NULL,
	"supplier_key" text NOT NULL,
	"last_process_by" jsonb DEFAULT 'null'::jsonb,
	"process_method" text DEFAULT '' NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"amount_combination_string" text DEFAULT '' NOT NULL,
	"response_path" text DEFAULT '' NOT NULL,
	"telegram_order_msg_id" text DEFAULT '' NOT NULL,
	"channel" text DEFAULT 'web' NOT NULL,
	"language" text DEFAULT 'Bahasa Melayu' NOT NULL,
	"prev_order_count" bigint DEFAULT 0 NOT NULL,
	"prev_order_id_count" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"ip_address" varchar(64) DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replaced_by_token_hash" text,
	"revoked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"password_hash" text,
	"invite_token" text,
	"invite_expires_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pending_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"order_id" varchar(12),
	"scheduled_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplier_game" ADD CONSTRAINT "supplier_game_supplier_key_supplier_key_fk" FOREIGN KEY ("supplier_key") REFERENCES "public"."supplier"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_game" ADD CONSTRAINT "supplier_game_game_key_game_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."game"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_game_key_game_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."game"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_supplier_key_supplier_key_fk" FOREIGN KEY ("supplier_key") REFERENCES "public"."supplier"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_game_key_game_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."game"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_game_key_game_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."game"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_supplier_key_supplier_key_fk" FOREIGN KEY ("supplier_key") REFERENCES "public"."supplier"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "external_link_external_id_idx" ON "external_link" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "external_link_expires_at_idx" ON "external_link" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_unique_idx" ON "product" USING btree ("game_key","supplier_key","name","amount");--> statement-breakpoint
CREATE INDEX "order_process_status_idx" ON "order" USING btree ("process_status");--> statement-breakpoint
CREATE INDEX "order_created_at_idx" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_game_supplier_idx" ON "order" USING btree ("game_key","supplier_key");--> statement-breakpoint
CREATE INDEX "order_fullname_idx" ON "order" USING btree ("fullname");--> statement-breakpoint
CREATE INDEX "order_game_id_idx" ON "order" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "order_response_path_idx" ON "order" USING btree ("response_path");--> statement-breakpoint
CREATE INDEX "refresh_token_user_idx" ON "refresh_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_token_hash_idx" ON "refresh_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "user" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pending_notification_due_idx" ON "pending_notification" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "pending_notification_order_idx" ON "pending_notification" USING btree ("order_id");