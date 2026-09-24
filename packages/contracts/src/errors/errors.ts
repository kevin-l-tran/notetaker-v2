import z from "zod";

export const ERROR_CODES = [
	// general errors
	"VALIDATION_ERROR",
	"UNAUTHORIZED",
	"FORBIDDEN",
	"INTERNAL_SERVER_ERROR",

	// user errors
	"USER_NOT_FOUND",

	// notebook errors
	"NOTEBOOK_NOT_FOUND",

	// notebook membership error
	"NOTEBOOK_MEMBERSHIP_NOT_FOUND",
	"NOTEBOOK_MEMBERSHIP_ALREADY_EXISTS",
	"INVALID_MEMBERSHIP_ROLE",
	"UPDATE_SELF_MEMBERSHIP",
] as const;

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export const ApiErrorResponseSchema = z.object({
	code: z.enum(ERROR_CODES),
	message: z.string(),
	details: z.record(z.string(), z.unknown()).optional(),
});
