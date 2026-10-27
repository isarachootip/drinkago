import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { Db, DB } from '../db/db';
import { LineCartItem, lineCartSessions, LineCartTempData, products } from '../db/schema';
import { buildCartFlex, buildProductCarouselFlex, LineMessage } from './line-flex.templates';

@Injectable()
export class LineCartService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getSession(lineUserId: string) {
    const [existing] = await this.db
      .select()
      .from(lineCartSessions)
      .where(eq(lineCartSessions.lineUserId, lineUserId))
      .limit(1);
    if (existing) return existing;

    const [created] = await this.db
      .insert(lineCartSessions)
      .values({ lineUserId, items: [], state: null, tempData: {} })
      .onConflictDoNothing()
      .returning();
    if (created) return created;

    const [reloaded] = await this.db
      .select()
      .from(lineCartSessions)
      .where(eq(lineCartSessions.lineUserId, lineUserId))
      .limit(1);
    return reloaded;
  }

  async showMenu(baseUrl: string): Promise<LineMessage[]> {
    const prods = await this.db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.id));
    if (prods.length === 0) {
      return [{ type: 'text', text: 'ขณะนี้ยังไม่มีรายการสินค้าพร้อมจำหน่ายครับ 🙏' }];
    }
    return [
      { type: 'text', text: '💧 เลือกสั่งน้ำดื่มจัดส่งถึงบ้าน (Delivery) ด้านล่างได้เลยครับ 👇' },
      buildProductCarouselFlex(prods, baseUrl),
    ];
  }

  async addItem(lineUserId: string, productId: number): Promise<LineMessage[]> {
    const [prod] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.active, true)))
      .limit(1);
    if (!prod) {
      return [{ type: 'text', text: '⚠️ ไม่พบสินค้านี้หรือสินค้าปิดจำหน่ายชั่วคราวครับ' }];
    }

    const session = await this.getSession(lineUserId);
    const items: LineCartItem[] = [...(session.items ?? [])];
    const idx = items.findIndex((i) => i.productId === prod.id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], qty: items[idx].qty + 1, priceSatang: prod.priceSatang, name: prod.name };
    } else {
      items.push({
        productId: prod.id,
        name: prod.name,
        priceSatang: prod.priceSatang,
        isReturnable: prod.isReturnable,
        qty: 1,
      });
    }

    await this.db
      .update(lineCartSessions)
      .set({ items, state: 'SHOPPING', updatedAt: new Date() })
      .where(eq(lineCartSessions.lineUserId, lineUserId));

    return [buildCartFlex(items)];
  }

  async changeQty(lineUserId: string, productId: number, delta: 1 | -1): Promise<LineMessage[]> {
    const session = await this.getSession(lineUserId);
    const items: LineCartItem[] = [...(session.items ?? [])];
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) return this.viewCart(lineUserId);

    const nextQty = items[idx].qty + delta;
    if (nextQty <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx] = { ...items[idx], qty: nextQty };
    }

    await this.db
      .update(lineCartSessions)
      .set({ items, state: items.length > 0 ? 'SHOPPING' : null, updatedAt: new Date() })
      .where(eq(lineCartSessions.lineUserId, lineUserId));

    if (items.length === 0) {
      return [{ type: 'text', text: '🗑️ ลบสินค้าเรียบร้อย ตะกร้าของคุณว่างเปล่าครับ' }];
    }
    return [buildCartFlex(items)];
  }

  async viewCart(lineUserId: string): Promise<LineMessage[]> {
    const session = await this.getSession(lineUserId);
    const items = session.items ?? [];
    if (items.length === 0) {
      return [{ type: 'text', text: '🛒 ตะกร้าของคุณยังว่างอยู่ครับ พิมพ์ "เมนู" เพื่อเลือกสั่งน้ำดื่มได้เลย 👇' }];
    }
    return [buildCartFlex(items)];
  }

  async clearCart(lineUserId: string): Promise<LineMessage[]> {
    await this.getSession(lineUserId);
    await this.db
      .update(lineCartSessions)
      .set({ items: [], state: null, tempData: {}, updatedAt: new Date() })
      .where(eq(lineCartSessions.lineUserId, lineUserId));
    return [{ type: 'text', text: '✅ ล้างตะกร้าสินค้าเรียบร้อยแล้วครับ สามารถเลือกสินค้าใหม่ได้เลย 👇' }];
  }

  async updateState(lineUserId: string, state: string | null, tempData: LineCartTempData = {}, clearItems = false) {
    await this.getSession(lineUserId);
    const patch: Partial<typeof lineCartSessions.$inferInsert> = {
      state,
      tempData,
      updatedAt: new Date(),
    };
    if (clearItems) patch.items = [];
    await this.db.update(lineCartSessions).set(patch).where(eq(lineCartSessions.lineUserId, lineUserId));
  }
}
