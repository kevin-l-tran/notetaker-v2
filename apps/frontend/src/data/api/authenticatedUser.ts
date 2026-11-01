import { UserSchema } from "@notetaker-v2/contracts";

export async function fetchAuthenticatedUser() {
	const response = await fetch("/api/me");

	if (!response.ok) {
		throw new Error("Failed to fetch user.");
	}

	const data = await response.json();
	return UserSchema.parse(data);
}
