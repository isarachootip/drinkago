-- order_events และ bag_ledger เป็นหลักฐาน: ห้ามแก้หรือลบในระดับฐานข้อมูล
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER order_events_append_only BEFORE UPDATE OR DELETE ON order_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER bag_ledger_append_only BEFORE UPDATE OR DELETE ON bag_ledger
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
