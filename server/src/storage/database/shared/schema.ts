import { pgTable, serial, timestamp, varchar, text, numeric, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 产品表 - 暖通辅材产品
export const products = pgTable(
	"products",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 200 }).notNull(),
		brand: varchar("brand", { length: 100 }).notNull(),
		category: varchar("category", { length: 50 }).notNull(),
		specifications: varchar("specifications", { length: 500 }),
		unit: varchar("unit", { length: 20 }).notNull().default("个"),
		price: numeric("price", { precision: 10, scale: 2 }),
		description: text("description"),
		image_url: varchar("image_url", { length: 500 }),
		is_active: sql`boolean DEFAULT true`.notNull(),
		created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index("products_category_idx").on(table.category),
		index("products_brand_idx").on(table.brand),
		index("products_name_idx").on(table.name),
	]
);
