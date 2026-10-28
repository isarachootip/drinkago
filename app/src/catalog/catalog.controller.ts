import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Roles } from '../common/auth';
import { DomainError } from '../common/errors';
import { parse } from '../common/validate';
import { Db, DB } from '../db/db';
import { orderItems, products } from '../db/schema';

const createProductSchema = z.object({
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  priceSatang: z.number().int().positive(),
  isReturnable: z.boolean().default(false),
  imageUrl: z.string().max(1000).nullable().optional(),
});

const updateProductSchema = z.object({
  sku: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(120).optional(),
  priceSatang: z.number().int().positive().optional(),
  isReturnable: z.boolean().optional(),
  imageUrl: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

function normalizeProductImageUrl(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const idx = trimmed.indexOf('/uploads/');
  if (idx >= 0) return trimmed.slice(idx);
  return trimmed;
}

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
        imageUrl: normalizeProductImageUrl(b.imageUrl),
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
    if (b.sku !== undefined) patch.sku = b.sku.trim();
    if (b.name !== undefined) patch.name = b.name.trim();
    if (b.priceSatang !== undefined) patch.priceSatang = b.priceSatang;
    if (b.isReturnable !== undefined) patch.isReturnable = b.isReturnable;
    if (b.imageUrl !== undefined) patch.imageUrl = normalizeProductImageUrl(b.imageUrl);
    if (b.active !== undefined) patch.active = b.active;

    try {
      const [updated] = await this.db.update(products).set(patch).where(eq(products.id, id)).returning();
      if (!updated) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบสินค้านี้');
      return updated;
    } catch (e) {
      if (e instanceof DomainError) throw e;
      throw new DomainError(409, 'PRODUCT_SKU_EXISTS', 'รหัสสินค้า (SKU) นี้มีอยู่ในระบบแล้ว');
    }
  }

  @Delete('admin/products/:id')
  @Roles('admin', 'warehouse')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const [target] = await this.db.select().from(products).where(eq(products.id, id));
    if (!target) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบสินค้านี้');

    const [{ itemCount }] = await this.db
      .select({ itemCount: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(eq(orderItems.productId, id));

    if (itemCount > 0) {
      await this.db.update(products).set({ active: false }).where(eq(products.id, id));
      return { id, deleted: true, mode: 'SOFT_DELETE' as const, active: false };
    }

    await this.db.delete(products).where(eq(products.id, id));
    return { id, deleted: true, mode: 'HARD_DELETE' as const, active: false };
  }
}
