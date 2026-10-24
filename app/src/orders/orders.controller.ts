import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Roles, User } from '../common/auth';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { evidenceSchema, parse, photoUrlSchema } from '../common/validate';
import { OrdersService } from './orders.service';

const createSchema = z.object({
  addressId: z.string().uuid(),
  items: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(100) })).min(1).max(20),
  expectBagReturn: z.number().int().min(0).max(200).default(0),
  paymentMethod: z.enum(['CASH', 'PROMPTPAY']),
  slotStart: z.coerce.date().optional(),
  slotEnd: z.coerce.date().optional(),
});
const reorderSchema = z.object({ expectBagReturn: z.number().int().min(0).max(200).optional(), addressId: z.string().uuid().optional() });
const statusSchema = z.enum(['PENDING', 'CONFIRMED', 'PACKED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'BAG_COLLECTED', 'BAG_RETURNED', 'CLOSED', 'CLOSED_WITH_RETURN', 'CANCELLED']);
const listSchema = z.object({ status: statusSchema.optional(), limit: z.coerce.number().int().min(1).max(200).optional() });
const evidenceBody = z.object({ evidence: evidenceSchema.default({}) });
const deliverSchema = z.object({
  evidence: evidenceSchema.default({}),
  otp: z.string().regex(/^\d{4}$/).optional(),
  bagsCollected: z.number().int().min(0).max(200).default(0),
  bagPhotoUrl: photoUrlSchema.optional(),
});
const failSchema = z.object({ evidence: evidenceSchema.default({}), reason: z.string().min(1).max(500) });
const receiveSchema = z.object({ evidence: evidenceSchema.default({}), counted: z.number().int().min(0).max(1000) });
const noteSchema = z.object({ note: z.string().min(1).max(500) });
const optionalNote = z.object({ note: z.string().max(500).optional() });
const assignSchema = z.object({ riderId: z.string().uuid() });
const slipSchema = z.object({ slipUrl: z.string().url(), ref: z.string().max(100).optional() });

const Id = () => Param('id', new ParseUUIDPipe());

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ลูกค้า
  @Post()
  @Roles('customer')
  create(@CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.create(u, parse(createSchema, body));
  }

  @Post('reorder')
  @Roles('customer')
  reorder(@CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.reorderLast(u, parse(reorderSchema, body));
  }

  @Get('mine')
  @Roles('customer')
  mine(@CurrentUser() u: User) {
    return this.orders.list({ customerId: u.id });
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles('customer', 'admin')
  cancel(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.cancel(id, u, parse(optionalNote, body).note);
  }

  @Post(':id/payment-slip')
  @HttpCode(200)
  @Roles('customer')
  slip(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.submitSlip(id, u, parse(slipSchema, body));
  }

  // ทุกบทบาท (ระบบกรองตามสิทธิ์)
  @Get(':id')
  get(@Id() id: string, @CurrentUser() u: User) {
    return this.orders.getVisible(id, u);
  }

  @Get(':id/events')
  async events(@Id() id: string, @CurrentUser() u: User) {
    await this.orders.getVisible(id, u);
    return this.orders.events(id);
  }

  // พนักงาน
  @Get()
  @Roles('warehouse', 'admin')
  list(@Query() q: unknown) {
    return this.orders.list(parse(listSchema, q));
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @Roles('warehouse', 'admin')
  confirm(@Id() id: string, @CurrentUser() u: User) {
    return this.orders.confirm(id, u);
  }

  @Post(':id/pack')
  @HttpCode(200)
  @Roles('warehouse', 'admin', 'rider')
  @UseInterceptors(IdempotencyInterceptor)
  pack(@Id() id: string, @CurrentUser() u: User) {
    return this.orders.pack(id, u);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @Roles('warehouse', 'admin')
  assign(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.assign(id, parse(assignSchema, body).riderId, u);
  }

  @Post(':id/receive-bags')
  @HttpCode(200)
  @Roles('warehouse', 'admin')
  @UseInterceptors(IdempotencyInterceptor)
  receiveBags(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.receiveBags(id, u, parse(receiveSchema, body));
  }

  // ไรเดอร์
  @Post(':id/pickup')
  @HttpCode(200)
  @Roles('rider')
  @UseInterceptors(IdempotencyInterceptor)
  pickup(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.pickUp(id, u, parse(evidenceBody, body).evidence);
  }

  @Post(':id/start')
  @HttpCode(200)
  @Roles('rider')
  @UseInterceptors(IdempotencyInterceptor)
  start(@Id() id: string, @CurrentUser() u: User) {
    return this.orders.startDelivery(id, u);
  }

  @Post(':id/deliver')
  @HttpCode(200)
  @Roles('rider')
  @UseInterceptors(IdempotencyInterceptor)
  deliver(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.deliver(id, u, parse(deliverSchema, body));
  }

  @Post(':id/fail')
  @HttpCode(200)
  @Roles('rider')
  @UseInterceptors(IdempotencyInterceptor)
  fail(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.failDelivery(id, u, parse(failSchema, body));
  }

  // แอดมิน
  @Post(':id/reschedule')
  @HttpCode(200)
  @Roles('admin')
  reschedule(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.reschedule(id, u, parse(optionalNote, body).note);
  }

  @Post(':id/resolve-bags')
  @HttpCode(200)
  @Roles('admin')
  resolveBags(@Id() id: string, @CurrentUser() u: User, @Body() body: unknown) {
    return this.orders.resolveBagMismatch(id, u, parse(noteSchema, body).note);
  }

  @Post(':id/verify-payment')
  @HttpCode(200)
  @Roles('admin')
  verifyPayment(@Id() id: string, @CurrentUser() u: User) {
    return this.orders.verifyPayment(id, u);
  }

  @Post(':id/unlock-otp')
  @HttpCode(200)
  @Roles('admin')
  unlockOtp(@Id() id: string, @CurrentUser() u: User) {
    return this.orders.unlockOtp(id, u);
  }
}

@Controller()
export class RiderController {
  constructor(private readonly orders: OrdersService) {}

  @Get('rider/jobs')
  @Roles('rider')
  jobs(@CurrentUser() u: User) {
    return this.orders.riderJobs(u.id);
  }

  @Get('riders')
  @Roles('warehouse', 'admin')
  riders() {
    return this.orders.listRiders();
  }

  @Get('admin/bag-mismatches')
  @Roles('admin')
  mismatches() {
    return this.orders.bagMismatches();
  }
}
