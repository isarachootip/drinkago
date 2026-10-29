import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { Public, Roles } from '../common/auth';
import { parse } from '../common/validate';
import { MeetupEventsService } from './meetup-events.service';

const createEventSchema = z.object({
  title: z.string().trim().max(200).optional(),
  eventDate: z.string().trim().min(1, 'กรุณาระบุวันที่จัดกิจกรรม').max(100),
  eventTime: z.string().trim().min(1, 'กรุณาระบุเวลา').max(50),
  locationName: z.string().trim().min(1, 'กรุณาระบุสถานที่จัดงาน').max(300),
  contactPhone: z.string().trim().min(3, 'กรุณาระบุเบอร์โทรศัพท์ติดต่อ').max(50),
  mapUrl: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().optional(),
});

const updateEventSchema = createEventSchema.partial();

@Controller()
export class MeetupEventsController {
  constructor(private readonly events: MeetupEventsService) {}

  @Get('events')
  @Public()
  listPublicEvents() {
    return this.events.listPublic();
  }

  @Get('admin/events')
  @Roles('admin', 'warehouse')
  listAdminEvents() {
    return this.events.listAll();
  }

  @Post('admin/events')
  @Roles('admin', 'warehouse')
  createEvent(@Body() body: unknown) {
    const dto = parse(createEventSchema, body);
    return this.events.create(dto);
  }

  @Patch('admin/events/:id')
  @Roles('admin', 'warehouse')
  updateEvent(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const dto = parse(updateEventSchema, body);
    return this.events.update(id, dto);
  }

  @Delete('admin/events/:id')
  @Roles('admin', 'warehouse')
  deleteEvent(@Param('id', ParseIntPipe) id: number) {
    return this.events.remove(id);
  }
}
