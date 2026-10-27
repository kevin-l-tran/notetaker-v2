import type { ERROR_CODES } from "@notetaker-v2/contracts";

type AppErrorOptions = ErrorOptions & {
	headers?: Record<string, string>;
};

export class AppError extends Error {
	readonly code: (typeof ERROR_CODES)[number];
	readonly statusCode: number;
	readonly details: Record<string, unknown> | undefined;
	readonly headers: Record<string, string> | undefined;

	constructor(
		code: (typeof ERROR_CODES)[number],
		message: string,
		statusCode: number,
		details?: Record<string, unknown>,
		options?: AppErrorOptions,
	) {
		super(message, options);

		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
		this.headers = options?.headers;

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
	constructor(details?: Record<string, unknown>, options?: ErrorOptions) {
		super("UNAUTHORIZED", "Authentication required.", 401, details, options);
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

export class InvalidInputError extends AppError {
	constructor(
		code: (typeof ERROR_CODES)[number],
		message: string,
		details?: Record<string, unknown>,
		options?: ErrorOptions,
	) {
		super(code, message, 422, details, options);
	}
}

export class InvariantError extends AppError {
	constructor(message: string, details?: Record<string, unknown>, options?: ErrorOptions) {
		super("INTERNAL_SERVER_ERROR", message, 500, details, options);
	}
}

export class SnapshotConflictError extends AppError {
	constructor() {
		super("SNAPSHOT_CONFLICT", "Could not obtain a consistent data snapshot.", 503, undefined, {
			headers: {
				"Retry-After": "1",
			},
		});
	}
}
