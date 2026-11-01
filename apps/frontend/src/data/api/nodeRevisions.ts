import {
	GetNodeRevisionResponseSchema,
	GetNodeRevisionsResponseSchema,
	type NodeId,
	type NotebookId,
	RestoreNodeRevisionResponseSchema,
} from "@notetaker-v2/contracts";

export async function fetchRevisions({
	notebookId,
	nodeId,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}/revisions`);

	if (!response.ok) throw new Error("Failed to fetch draft");

	const data = await response.json();

	return GetNodeRevisionsResponseSchema.parse(data);
}

export async function fetchRevision({
	notebookId,
	nodeId,
	revisionNumber,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
	revisionNumber: number;
}) {
	const response = await fetch(
		`/api/notebooks/${notebookId}/nodes/${nodeId}/revisions/${revisionNumber}`,
	);

	if (!response.ok) throw new Error("Failed to fetch draft");

	const data = await response.json();

	return GetNodeRevisionResponseSchema.parse(data);
}

export async function restoreRevision({
	notebookId,
	nodeId,
	revisionNumber,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
	revisionNumber: number;
}) {
	const response = await fetch(
		`/api/notebooks/${notebookId}/nodes/${nodeId}/revisions/${revisionNumber}/restore`,
		{ method: "POST" },
	);

	if (!response.ok) throw new Error("Failed to fetch draft");

	const data = await response.json();

	return RestoreNodeRevisionResponseSchema.parse(data);
}
