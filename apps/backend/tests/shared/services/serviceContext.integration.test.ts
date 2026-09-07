import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { appUsers } from "../../../src/database/schema/appUsers.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("service context transactions", () => {
	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(appUsers); // arbitrary table for testing
		});
	});

	it("rolls back work when the transaction fails", async () => {
		const context = createServiceContext(db);
		const id = crypto.randomUUID();

		await expect(
			context.transaction(async (transactionContext) => {
				await transactionContext.database.insert(appUsers).values({ id });

				throw new Error("Force rollback");
			}),
		).rejects.toThrow("Force rollback");

		const rows = await db.select().from(appUsers).where(eq(appUsers.id, id));

		expect(rows).toHaveLength(0);
	});

	it("uses the same transaction across nested requests", async () => {
		const context = createServiceContext(db);

		const outerId = crypto.randomUUID();
		const innerId = crypto.randomUUID();

		await expect(
			context.transaction(async (outerContext) => {
				await outerContext.database.insert(appUsers).values({ id: outerId });

				await outerContext.transaction(async (innerContext) => {
					await innerContext.database.insert(appUsers).values({ id: innerId });
				});

				throw new Error("Force outer rollback");
			}),
		).rejects.toThrow("Force outer rollback");

		const outerRows = await db.select().from(appUsers).where(eq(appUsers.id, outerId));

		const innerRows = await db.select().from(appUsers).where(eq(appUsers.id, innerId));

		expect(outerRows).toHaveLength(0);
		expect(innerRows).toHaveLength(0);
	});
});
