import {
	type CreateNodeRequest,
	type Node,
	type NodeId,
	NodeSchema,
	type NotebookId,
} from "@notetaker-v2/contracts";

export async function fetchNodes({ notebookId }: { notebookId: NotebookId }): Promise<Node[]> {
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
}): Promise<Node> {
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
}): Promise<Node> {
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

export async function deleteNode({
	notebookId,
	nodeId,
}: {
	notebookId: NotebookId;
	nodeId: NodeId;
}): Promise<void> {
	const response = await fetch(`/api/notebooks/${notebookId}/nodes/${nodeId}`, {
		method: "DELETE",
	});

	if (!response.ok) throw new Error("Failed to delete node");

	return;
}
