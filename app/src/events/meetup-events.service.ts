import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DomainError } from '../common/errors';
import { Db, DB } from '../db/db';

export interface MeetupEventItem {
  id: number;
  title: string;
  eventDate: string;
  eventTime: string;
  locationName: string;
  contactPhone: string;
  mapUrl: string;
  active: boolean;
  createdAt: string;
}

export interface CreateMeetupEventInput {
  title?: string;
  eventDate: string;
  eventTime: string;
  locationName: string;
  contactPhone: string;
  mapUrl?: string | null;
  active?: boolean;
}

interface RawMeetupRow extends Record<string, unknown> {
  id: number;
  title: string;
  event_date: string;
  event_time: string;
  location_name: string;
  contact_phone: string;
  map_url: string;
  active: boolean;
  created_at: Date | string;
}

export function buildGoogleMapsSearchUrl(locationName: string, rawMapUrl?: string | null): string {
  const trimmed = (rawMapUrl ?? '').trim();
  if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName.trim() || 'ประเทศไทย')}`;
}

@Injectable()
export class MeetupEventsService {
  private initialized = false;

  constructor(@Inject(DB) private readonly db: Db) {}

  private async ensureReady() {
    if (this.initialized) return;
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS meetup_events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        event_date TEXT NOT NULL,
        event_time TEXT NOT NULL,
        location_name TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        map_url TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_migrations_log (
        key TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const seeded = await this.db.execute<{ key: string }>(
      sql`SELECT key FROM system_migrations_log WHERE key = 'seed_meetup_events_v1' LIMIT 1`,
    );
    if (seeded.rows.length === 0) {
      const existing = await this.db.execute<{ cnt: string }>(sql`SELECT count(*)::text AS cnt FROM meetup_events`);
      if (Number(existing.rows[0]?.cnt ?? '0') === 0) {
        const defaultLocation = 'โรงแรมอุทัยรัตน อ เมือง อุทัยธานี';
        const defaultMap = buildGoogleMapsSearchUrl(defaultLocation);
        await this.db.execute(sql`
          INSERT INTO meetup_events (title, event_date, event_time, location_name, contact_phone, map_url, active)
          VALUES ('กิจกรรมพบปะทีม ilife', '17 มีนา 2569', '10.00', ${defaultLocation}, '0634455', ${defaultMap}, true)
        `);
      }
      await this.db.execute(sql`
        INSERT INTO system_migrations_log (key) VALUES ('seed_meetup_events_v1') ON CONFLICT (key) DO NOTHING
      `);
    }
    this.initialized = true;
  }

  private mapRow(r: RawMeetupRow): MeetupEventItem {
    return {
      id: Number(r.id),
      title: r.title,
      eventDate: r.event_date,
      eventTime: r.event_time,
      locationName: r.location_name,
      contactPhone: r.contact_phone,
      mapUrl: r.map_url,
      active: Boolean(r.active),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    };
  }

  async listPublic(): Promise<MeetupEventItem[]> {
    await this.ensureReady();
    const res = await this.db.execute<RawMeetupRow>(
      sql`SELECT * FROM meetup_events WHERE active = true ORDER BY id ASC`,
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  async listAll(): Promise<MeetupEventItem[]> {
    await this.ensureReady();
    const res = await this.db.execute<RawMeetupRow>(sql`SELECT * FROM meetup_events ORDER BY id ASC`);
    return res.rows.map((r) => this.mapRow(r));
  }

  async create(input: CreateMeetupEventInput): Promise<MeetupEventItem> {
    await this.ensureReady();
    const title = (input.title ?? '').trim() || `กิจกรรมพบปะทีม ilife (${input.locationName.trim()})`;
    const mapUrl = buildGoogleMapsSearchUrl(input.locationName, input.mapUrl);
    const active = input.active ?? true;
    const res = await this.db.execute<RawMeetupRow>(sql`
      INSERT INTO meetup_events (title, event_date, event_time, location_name, contact_phone, map_url, active)
      VALUES (${title}, ${input.eventDate.trim()}, ${input.eventTime.trim()}, ${input.locationName.trim()}, ${input.contactPhone.trim()}, ${mapUrl}, ${active})
      RETURNING *
    `);
    return this.mapRow(res.rows[0]);
  }

  async update(id: number, patch: Partial<CreateMeetupEventInput>): Promise<MeetupEventItem> {
    await this.ensureReady();
    const existingRes = await this.db.execute<RawMeetupRow>(sql`SELECT * FROM meetup_events WHERE id = ${id} LIMIT 1`);
    const cur = existingRes.rows[0];
    if (!cur) throw new DomainError(404, 'EVENT_NOT_FOUND', 'ไม่พบรายการกิจกรรมพบปะ');

    const locationName = patch.locationName !== undefined ? patch.locationName.trim() : cur.location_name;
    const title = patch.title !== undefined ? patch.title.trim() || cur.title : cur.title;
    const eventDate = patch.eventDate !== undefined ? patch.eventDate.trim() : cur.event_date;
    const eventTime = patch.eventTime !== undefined ? patch.eventTime.trim() : cur.event_time;
    const contactPhone = patch.contactPhone !== undefined ? patch.contactPhone.trim() : cur.contact_phone;
    const mapUrl = patch.mapUrl !== undefined ? buildGoogleMapsSearchUrl(locationName, patch.mapUrl) : cur.map_url;
    const active = patch.active !== undefined ? patch.active : cur.active;

    const res = await this.db.execute<RawMeetupRow>(sql`
      UPDATE meetup_events
      SET title = ${title}, event_date = ${eventDate}, event_time = ${eventTime},
          location_name = ${locationName}, contact_phone = ${contactPhone}, map_url = ${mapUrl}, active = ${active}
      WHERE id = ${id}
      RETURNING *
    `);
    return this.mapRow(res.rows[0]);
  }

  async remove(id: number): Promise<{ id: number; deleted: boolean }> {
    await this.ensureReady();
    const res = await this.db.execute<{ id: number }>(sql`DELETE FROM meetup_events WHERE id = ${id} RETURNING id`);
    if (res.rows.length === 0) throw new DomainError(404, 'EVENT_NOT_FOUND', 'ไม่พบรายการกิจกรรมพบปะ');
    return { id, deleted: true };
  }
}
