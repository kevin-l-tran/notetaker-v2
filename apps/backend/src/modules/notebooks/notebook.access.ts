import type { AppUser } from "../../database/schema/appUsers.ts";
import type { NotebookMember } from "../../database/schema/notebookMembers.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createNotebookMemberRepository } from "./notebookMember.repository.ts";

export async function requireMembership(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebook({ appUserId, notebookId });

	if (!membership) throw new ForbiddenError("Could not find notebook membership.");

	return membership;
}

export async function requireOwnership(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebook({ appUserId, notebookId });

	if (membership?.role !== "owner")
		throw new ForbiddenError("Must be the notebook owner to perform this operation.");

	return membership;
}

export async function requireTargetMembership(
	context: ServiceContext,
	memberId: NotebookMember["id"],
	notebookId: Notebook["id"],
) {
	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const targetMembership = await notebookMemberRepo.findByIdAndNotebook({
		id: memberId,
		notebookId: notebookId,
	});

	if (!targetMembership)
		throw new NotFoundError("NOTEBOOK_MEMBERSHIP_NOT_FOUND", "Could not find notebook membership.");

	return targetMembership;
}
