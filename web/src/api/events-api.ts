import { z } from 'zod';
import { requestJson } from './role-api';

export const meetupEventSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  eventDate: z.string(),
  eventTime: z.string(),
  locationName: z.string(),
  contactPhone: z.string(),
  mapUrl: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
});

export type MeetupEvent = z.infer<typeof meetupEventSchema>;

export interface CreateMeetupEventPayload {
  title?: string;
  eventDate: string;
  eventTime: string;
  locationName: string;
  contactPhone: string;
  mapUrl?: string | null;
  active?: boolean;
}

export const eventsApi = {
  listPublicEvents: async (): Promise<MeetupEvent[]> =>
    z.array(meetupEventSchema).parse(await requestJson('/events')),

  listAdminEvents: async (user = 'dev-admin'): Promise<MeetupEvent[]> =>
    z.array(meetupEventSchema).parse(
      await requestJson('/admin/events', { useStaffToken: true, userOverride: user }),
    ),

  createEvent: async (body: CreateMeetupEventPayload, user = 'dev-admin'): Promise<MeetupEvent> =>
    meetupEventSchema.parse(
      await requestJson('/admin/events', {
        method: 'POST',
        body,
        useStaffToken: true,
        userOverride: user,
      }),
    ),

  updateEvent: async (
    id: number,
    body: Partial<CreateMeetupEventPayload>,
    user = 'dev-admin',
  ): Promise<MeetupEvent> =>
    meetupEventSchema.parse(
      await requestJson(`/admin/events/${id}`, {
        method: 'PATCH',
        body,
        useStaffToken: true,
        userOverride: user,
      }),
    ),

  deleteEvent: (id: number, user = 'dev-admin') =>
    requestJson<{ id: number; deleted: boolean }>(`/admin/events/${id}`, {
      method: 'DELETE',
      useStaffToken: true,
      userOverride: user,
    }),
};
