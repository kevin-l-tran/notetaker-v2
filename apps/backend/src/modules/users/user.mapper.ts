import { UserSchema } from "@notetaker-v2/contracts";
import type { AppUser } from "../../database/schema/appUsers.ts";

export function toUserDTO(input: { appUser: AppUser; email: string }) {
	const user = {
		id: input.appUser.id,
		email: input.email,
		displayName: input.appUser.displayName ?? undefined,
		createdAt: input.appUser.createdAt.toISOString(),
		updatedAt: input.appUser.updatedAt.toISOString(),
	};

	return UserSchema.parse(user);
}
