import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { Roles } from '../common/auth';
import { DomainError } from '../common/errors';
import { parse } from '../common/validate';
import { Db, DB } from '../db/db';
import { products } from '../db/schema';

const createProductSchema = z.object({
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  priceSatang: z.number().int().positive(),
  isReturnable: z.boolean().default(false),
  imageUrl: z.string().max(1000).nullable().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  priceSatang: z.number().int().positive().optional(),
  isReturnable: z.boolean().optional(),
  imageUrl: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

@Controller()
export class CatalogController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('products')
  list() {
    return this.db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.id));
  }

  @Get('admin/products')
  @Roles('admin', 'warehouse')
  listAll() {
    return this.db.select().from(products).orderBy(asc(products.id));
  }

  @Post('admin/products')
  @Roles('admin', 'warehouse')
  async create(@Body() body: unknown) {
    const b = parse(createProductSchema, body);
    const [created] = await this.db
      .insert(products)
      .values({
        sku: b.sku.trim(),
        name: b.name.trim(),
        priceSatang: b.priceSatang,
        isReturnable: b.isReturnable,
        imageUrl: b.imageUrl?.trim() || null,
        active: true,
      })
      .onConflictDoNothing()
      .returning();
    if (!created) throw new DomainError(409, 'PRODUCT_SKU_EXISTS', 'รหัสสินค้า (SKU) นี้มีอยู่ในระบบแล้ว');
    return created;
  }

  @Patch('admin/products/:id')
  @Roles('admin', 'warehouse')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const b = parse(updateProductSchema, body);
    const patch: Partial<typeof products.$inferInsert> = {};
    if (b.name !== undefined) patch.name = b.name.trim();
    if (b.priceSatang !== undefined) patch.priceSatang = b.priceSatang;
    if (b.isReturnable !== undefined) patch.isReturnable = b.isReturnable;
    if (b.imageUrl !== undefined) patch.imageUrl = b.imageUrl ? b.imageUrl.trim() : null;
    if (b.active !== undefined) patch.active = b.active;

    const [updated] = await this.db.update(products).set(patch).where(eq(products.id, id)).returning();
    if (!updated) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบสินค้านี้');
    return updated;
  }
}
