import {
	CreateNodeDraftResponseSchema,
	GetNodeDraftResponseSchema,
	type NodeDraftId,
	type NodeId,
	type NotebookId,
	type PublishDraftRequest,
	PublishNodeDraftResponseSchema,
	type SaveDraftRequest,
	SaveNodeDraftResponseSchema,
} from "@notetaker-v2/contracts";

export async function fetchDraft({
	notebookId,
	nodeId,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}/draft`);

	if (!response.ok) throw new Error("Failed to fetch draft");

	const data = await response.json();

	return GetNodeDraftResponseSchema.parse(data);
}

export async function createDraft({
	notebookId,
	nodeId,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}/draft`, {
		method: "POST",
	});

	if (!response.ok) throw new Error("Failed to create draft");

	const data = await response.json();

	return CreateNodeDraftResponseSchema.parse(data);
}

export async function publishDraft({
	notebookId,
	nodeId,
	draftId,
	input,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
	input: PublishDraftRequest;
}) {
	const response = await fetch(
		`/api/notebooks/${notebookId}/nodes/${nodeId}/draft/${draftId}/publish`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(input),
		},
	);

	if (!response.ok) throw new Error("Failed to publish draft");

	const data = await response.json();

	return PublishNodeDraftResponseSchema.parse(data);
}

export async function saveDraft({
	notebookId,
	nodeId,
	draftId,
	input,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
	input: SaveDraftRequest;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}/draft/${draftId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) throw new Error("Failed to save draft");

	const data = await response.json();

	return SaveNodeDraftResponseSchema.parse(data);
}

export async function deleteDraft({
	notebookId,
	nodeId,
	draftId,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}/draft/${draftId}`, {
		method: "DELETE",
	});

	if (!response.ok) throw new Error("Failed to delete node");

	return;
}
