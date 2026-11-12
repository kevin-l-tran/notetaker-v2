import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { decodeDocument } from "@notetaker-v2/node_document";
import { DraftSession } from "./DraftSession";
import type { OpenDraftOperation, SaveDraftOperation } from "./draftOperationTypes";

export function sessionFactory(openDraft: OpenDraftOperation, saveDraft: SaveDraftOperation) {
	return async (notebookId: NotebookId, nodeId: NodeId): Promise<DraftSession> => {
		const draft = await openDraft({ notebookId, nodeId });

		const byteState = Uint8Array.from(atob(draft.state), (c) => c.charCodeAt(0));
		const doc = decodeDocument(byteState);

		return new DraftSession({
			notebookId,
			nodeId,
			draftId: draft.id,
			doc,
			initialSaveVersion: draft.saveVersion,
			saveDraft,
		});
	};
}
