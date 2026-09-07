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

export class BadRequestError extends AppError {
	constructor(
		code: (typeof ERROR_CODES)[number],
		message: string,
		details?: Record<string, unknown>,
		options?: ErrorOptions,
	) {
		super(code, message, 400, details, options);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message: string, details?: Record<string, unknown>, options?: ErrorOptions) {
		super("UNAUTHORIZED", message, 401, details, options);
	}
}

export class ForbiddenError extends AppError {
	constructor(message: string, details?: Record<string, unknown>, options?: ErrorOptions) {
		super("FORBIDDEN", message, 403, details, options);
	}
}

export class NotFoundError extends AppError {
	constructor(
		code: (typeof ERROR_CODES)[number],
		message: string,
		details?: Record<string, unknown>,
		options?: ErrorOptions,
	) {
		super(code, message, 404, details, options);
	}
}

export class ConflictError extends AppError {
	constructor(
		code: (typeof ERROR_CODES)[number],
		message: string,
		details?: Record<string, unknown>,
		options?: ErrorOptions,
	) {
		super(code, message, 409, details, options);
	}
}
