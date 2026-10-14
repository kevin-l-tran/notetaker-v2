import type { AppUser } from "../../database/schema/appUsers.ts";
import type { NotebookMember } from "../../database/schema/notebookMembers.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createNotebookRepository } from "./notebook.repository.ts";
import { createNotebookMemberRepository } from "./notebookMember.repository.ts";

export async function requireNotebookForUpdate(
	context: ServiceContext,
	notebookId: Notebook["id"],
) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebook = await notebookRepo.findByIdForUpdate({ id: notebookId });

	if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

	return notebook;
}

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

export async function requireMembershipForKeyShare(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebook = await notebookRepo.findByIdForKeyShare({ id: notebookId });

	if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebookForKeyShare({
		appUserId,
		notebookId,
	});

	if (!membership) throw new ForbiddenError("Could not find notebook membership.");

	return membership;
}

export async function requireMembershipForUpdate(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebook = await notebookRepo.findByIdForKeyShare({ id: notebookId });

	if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebookForUpdate({
		appUserId,
		notebookId,
	});

	if (!membership) throw new ForbiddenError("Could not find notebook membership.");

	return membership;
}

export async function requireEditPermissions(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebook({ appUserId, notebookId });

	if (membership?.role !== "owner" && membership?.role !== "editor")
		throw new ForbiddenError("Must have editor permissions to perform this operation.");

	return membership;
}

export async function requireEditPermissionsForShare(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebook = await notebookRepo.findByIdForKeyShare({ id: notebookId });

	if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebookForShare({
		appUserId,
		notebookId,
	});

	if (membership?.role !== "owner" && membership?.role !== "editor")
		throw new ForbiddenError("Must have editor permissions to perform this operation.");

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

export async function requireOwnershipForShare(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebook = await notebookRepo.findByIdForKeyShare({ id: notebookId });

	if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebookForShare({
		appUserId,
		notebookId,
	});

	if (membership?.role !== "owner")
		throw new ForbiddenError("Must be the notebook owner to perform this operation.");

	return membership;
}

export async function requireOwnershipForUpdate(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebook = await notebookRepo.findByIdForKeyShare({ id: notebookId });

	if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const membership = await notebookMemberRepo.findByUserAndNotebookForUpdate({
		appUserId,
		notebookId,
	});

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

export async function requireTargetMembershipForUpdate(
	context: ServiceContext,
	memberId: NotebookMember["id"],
	notebookId: Notebook["id"],
) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebook = await notebookRepo.findByIdForKeyShare({ id: notebookId });

	if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

	const notebookMemberRepo = createNotebookMemberRepository(context.database);
	const targetMembership = await notebookMemberRepo.findByIdAndNotebookForUpdate({
		id: memberId,
		notebookId: notebookId,
	});

	if (!targetMembership)
		throw new NotFoundError("NOTEBOOK_MEMBERSHIP_NOT_FOUND", "Could not find notebook membership.");

	return targetMembership;
}
