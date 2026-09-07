import type { ERROR_CODES } from "@notetaker-v2/contracts";

export class AppError extends Error {
	readonly code: (typeof ERROR_CODES)[number];
	readonly statusCode: number;
	readonly details: Record<string, unknown> | undefined;

	constructor(
		code: (typeof ERROR_CODES)[number],
		message: string,
		statusCode: number,
		details?: Record<string, unknown>,
		options?: ErrorOptions,
	) {
		super(message, options);

		this.code = code;
		this.statusCode = statusCode;
		this.details = details;

		this.name = new.target.name;
	}
}
