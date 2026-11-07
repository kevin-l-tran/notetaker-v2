import type { NodeDraftId, NodeId, NotebookId } from "@notetaker-v2/contracts";
import { encodeDocument } from "@notetaker-v2/node_document";
import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import { useSaveDraft } from "../../../../../data/api/mutations/nodes";

type UseNodeDraftAutosaveProps = {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
	doc: Y.Doc;
	initialSaveVersion: number;
};

export function useNodeDraftAutosave({
	notebookId,
	nodeId,
	draftId,
	doc,
	initialSaveVersion,
}: UseNodeDraftAutosaveProps) {
	const { status, error, mutateAsync: saveDraft } = useSaveDraft(notebookId, nodeId, draftId);

	const [isDirty, setIsDirty] = useState(false);

	const saveVersion = useRef(initialSaveVersion);
	const changeVersion = useRef(0);
	const savedChangeVersion = useRef(0);

	const activeSave = useRef<Promise<number> | null>(null);
	const timeoutIdRef = useRef<number | null>(null);

	const save = useCallback((): Promise<number> => {
		if (activeSave.current) return activeSave.current;

		if (changeVersion.current === savedChangeVersion.current) {
			return Promise.resolve(saveVersion.current);
		}

		const savingChangeVersion = changeVersion.current;
		const expectedSaveVersion = saveVersion.current;

		let stateString = "";
		const bytes = encodeDocument(doc);
		// we can't spread bytes into String.fromCharCode since it may exceed
		// the maximum number of function arguments.
		for (const byte of bytes) {
			stateString += String.fromCharCode(byte);
		}
		const state = btoa(stateString);

		const promise = saveDraft({ expectedSaveVersion, state })
			.then((newDraft) => {
				saveVersion.current = newDraft.saveVersion;
				savedChangeVersion.current = savingChangeVersion;

				setIsDirty(changeVersion.current !== savedChangeVersion.current);
				return newDraft.saveVersion;
			})
			.finally(() => {
				activeSave.current = null;
			});

		activeSave.current = promise;
		return promise;
	}, [doc, saveDraft]);

	const flush = useCallback(async (): Promise<number> => {
		while (activeSave.current || changeVersion.current !== savedChangeVersion.current) {
			await save();
		}

		return saveVersion.current;
	}, [save]);

	useEffect(() => {
		const handler = () => {
			changeVersion.current += 1;
			setIsDirty(true);
		};

		doc.on("update", handler);

		timeoutIdRef.current = window.setInterval(() => {
			void save().catch();
		}, 3000);

		return () => {
			doc.off("update", handler);

			if (timeoutIdRef.current !== null) {
				window.clearInterval(timeoutIdRef.current);
				timeoutIdRef.current = null;
			}
		};
	}, [doc, save]);

	return {
		status,
		error,
		save,
		flush,
		isDirty,
	};
}
