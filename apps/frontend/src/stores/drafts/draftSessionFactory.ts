import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { decodeDocument } from "@notetaker-v2/node_document";
import { createDraft } from "../../data/api/nodeDrafts";
import { DraftSession } from "./DraftSession";

export async function sessionFactory(notebookId: NotebookId, nodeId: NodeId) {
	const draft = await createDraft({ notebookId, nodeId });

	const byteState = Uint8Array.from(atob(draft.state), (c) => c.charCodeAt(0));
	const doc = decodeDocument(byteState);

	return new DraftSession({
		notebookId,
		nodeId,
		draftId: draft.id,
		doc,
		initialSaveVersion: draft.saveVersion,
	});
}
