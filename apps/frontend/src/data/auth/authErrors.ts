import type { authClient } from "./authClient";

export interface AuthError {
	kind: "invalid_credentials" | "email_not_verified" | "rate_limited" | "unexpected";
	message: string;
}

interface BetterAuthError {
	code?: string;
	status?: number;
}

const errorMap = {
	USER_NOT_FOUND: {
		kind: "invalid_credentials",
		message: "Invalid email or password.",
	},
	INVALID_EMAIL_OR_PASSWORD: {
		kind: "invalid_credentials",
		message: "Invalid email or password.",
	},
	INVALID_PASSWORD: {
		kind: "invalid_credentials",
		message: "Invalid email or password.",
	},
	CREDENTIAL_ACCOUNT_NOT_FOUND: {
		kind: "invalid_credentials",
		message: "Invalid email or password.",
	},
	EMAIL_NOT_VERIFIED: {
		kind: "email_not_verified",
		message: "Verify your email before signing in.",
	},
} satisfies Partial<Record<keyof typeof authClient.$ERROR_CODES, AuthError>>;

export function mapAuthError(error: BetterAuthError) {
	if (error.status === 429) {
		return {
			kind: "rate_limited",
			message: "Too many attempts. Try again later.",
		};
	}

	if (error.code && error.code in errorMap) {
		return errorMap[error.code as keyof typeof errorMap];
	}

	return {
		kind: "unexpected",
		message: "Unable to sign in. Please try again.",
	};
}
