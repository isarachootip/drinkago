CREATE TYPE "public"."station_bag_movement" AS ENUM('RESTOCK_IN', 'DISPENSED_OUT', 'RETURNED_IN', 'ADJUST');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'CREDIT';--> statement-breakpoint
CREATE TABLE "station_bag_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"order_id" uuid,
	"customer_id" uuid,
	"movement" "station_bag_movement" NOT NULL,
	"qty" integer NOT NULL,
	"actor_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "water_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address_detail" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "station_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credit_limit_satang" integer DEFAULT 100000 NOT NULL;--> statement-breakpoint
ALTER TABLE "station_bag_ledger" ADD CONSTRAINT "station_bag_ledger_station_id_water_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."water_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_bag_ledger" ADD CONSTRAINT "station_bag_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_bag_ledger" ADD CONSTRAINT "station_bag_ledger_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_bag_ledger" ADD CONSTRAINT "station_bag_ledger_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "station_bag_ledger_station_idx" ON "station_bag_ledger" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "station_bag_ledger_customer_idx" ON "station_bag_ledger" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "water_stations_code_uq" ON "water_stations" USING btree ("code");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_station_id_water_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."water_stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TRIGGER station_bag_ledger_append_only BEFORE UPDATE OR DELETE ON station_bag_ledger
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
