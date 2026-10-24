import { Controller, Get, Inject } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { Db, DB } from '../db/db';
import { products } from '../db/schema';

@Controller('products')
export class CatalogController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  list() {
    return this.db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.id));
  }
}
