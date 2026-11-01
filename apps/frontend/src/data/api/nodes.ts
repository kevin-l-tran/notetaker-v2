import {
	type CreateNodeRequest,
	CreateNodeResponseSchema,
	GetNodeResponseSchema,
	GetNodesResponseSchema,
	type NodeId,
	type NotebookId,
} from "@notetaker-v2/contracts";

export async function fetchNodes({ notebookId }: { notebookId: NotebookId }) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes`);

	if (!response.ok) throw new Error("Failed to fetch nodes");

	const data = await response.json();

	return GetNodesResponseSchema.parse(data);
}

export async function fetchNode({
	notebookId,
	nodeId,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}`);

	if (!response.ok) throw new Error("Failed to fetch node");

	const data = await response.json();

	return GetNodeResponseSchema.parse(data);
}

export async function createNode({
	notebookId,
	input,
}: {
	notebookId: NotebookId;
	input: CreateNodeRequest;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) throw new Error("Failed to create node");

	const data = await response.json();

	return CreateNodeResponseSchema.parse(data);
}

export async function deleteNode({
	notebookId,
	nodeId,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}`, {
		method: "DELETE",
	});

	if (!response.ok) throw new Error("Failed to delete node");

	return;
}
