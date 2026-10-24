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
	"OUTDATED_NOTEBOOK_PUBLICATION_VERSION",

	// notebook membership error
	"NOTEBOOK_MEMBERSHIP_NOT_FOUND",
	"NOTEBOOK_MEMBERSHIP_ALREADY_EXISTS",
	"INVALID_MEMBERSHIP_ROLE",
	"UPDATE_SELF_MEMBERSHIP",

	// node errors
	"NODE_NOT_FOUND",

	// node revision errors
	"NODE_REVISION_NOT_FOUND",

	// node draft errors
	"NODE_DRAFT_NOT_FOUND",
	"STALE_NODE_DRAFT",
	"INVALID_DRAFT_CONTENT",
] as const;

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export const ApiErrorResponseSchema = z.object({
	code: z.enum(ERROR_CODES),
	message: z.string(),
	details: z.record(z.string(), z.unknown()).optional(),
});
