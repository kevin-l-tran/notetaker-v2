import type { Database, DatabaseExecutor } from "../../database/types.ts";

export interface ServiceContext {
	readonly database: DatabaseExecutor;

	transaction<T>(callback: (context: ServiceContext) => Promise<T>): Promise<T>;
}

export function createServiceContext(database: Database): ServiceContext {
	return {
		database,

		transaction<T>(callback: (context: ServiceContext) => Promise<T>): Promise<T> {
			return database.transaction((transaction) => {
				const transactionContext = createTransactionContext(transaction);

				return callback(transactionContext);
			});
		},
	};
}

function createTransactionContext(database: DatabaseExecutor): ServiceContext {
	const context: ServiceContext = {
		database,

		transaction<T>(callback: (context: ServiceContext) => Promise<T>): Promise<T> {
			// nested transactions reuse the current transaction
			return callback(context);
		},
	};

	return context;
}
