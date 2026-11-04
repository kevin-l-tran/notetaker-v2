import { UserSchema } from "@notetaker-v2/contracts";
import { parseApiError } from "./errors";

export async function fetchAuthenticatedUser() {
	const response = await fetch("/api/me");

	if (!response.ok) throw await parseApiError(response);

	const data = await response.json();
	return UserSchema.parse(data);
}
