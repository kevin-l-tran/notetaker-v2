import {
	type CreateNodeRequest,
	type NodeId,
	NodeSchema,
	type NotebookId,
	type UpdateNodeRequest,
} from "@notetaker-v2/contracts";

export async function fetchNodes({ notebookId }: { notebookId: NotebookId }) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes`);

	if (!response.ok) throw new Error("Failed to fetch nodes");

	const data = await response.json();

	return data.map((item: unknown) => NodeSchema.parse(item));
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

	return NodeSchema.parse(data);
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

	return NodeSchema.parse(data);
}

export async function updateNode({
	notebookId,
	nodeId,
	input,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
	input: UpdateNodeRequest;
}) {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) throw new Error("Failed to update node");

	const data = await response.json();

	return NodeSchema.parse(data);
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
