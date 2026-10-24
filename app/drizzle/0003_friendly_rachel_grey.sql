ALTER TABLE "orders" ADD COLUMN "otp_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "otp_locked" boolean DEFAULT false NOT NULL;