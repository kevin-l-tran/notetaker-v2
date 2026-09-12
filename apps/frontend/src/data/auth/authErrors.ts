import type { authClient } from "./authClient";

export interface AuthError {
	kind:
		| "invalid_credentials"
		| "email_not_verified"
		| "user_already_exists"
		| "invalid_password"
		| "rate_limited"
		| "unexpected";
	message: string;
}

interface BetterAuthError {
	code?: string;
	status?: number;
}

const signInErrorMap = {
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

const signUpErrorMap = {
	USER_ALREADY_EXISTS: {
		kind: "user_already_exists",
		message: "An account with this email already exists.",
	},
	PASSWORD_TOO_SHORT: {
		kind: "invalid_password",
		message: "Password is too short.",
	},
	PASSWORD_TOO_LONG: {
		kind: "invalid_password",
		message: "Password is too long.",
	},
} satisfies Partial<Record<keyof typeof authClient.$ERROR_CODES, AuthError>>;

function mapError(
	error: BetterAuthError,
	errorMap: Partial<Record<keyof typeof authClient.$ERROR_CODES, AuthError>>,
	fallbackMessage: string,
): AuthError {
	if (error.status === 429) {
		return {
			kind: "rate_limited",
			message: "Too many attempts. Try again later.",
		};
	}

	const customError = errorMap[error.code as keyof typeof errorMap];
	if (customError) {
		return customError;
	}

	return {
		kind: "unexpected",
		message: fallbackMessage,
	};
}

export function mapSignInError(error: BetterAuthError): AuthError {
	return mapError(error, signInErrorMap, "Unable to sign in. Please try again.");
}

export function mapSignUpError(error: BetterAuthError): AuthError {
	return mapError(error, signUpErrorMap, "Unable to create an account. Please try again.");
}
