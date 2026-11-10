import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useCallback, useSyncExternalStore } from "react";
import type { DraftSession } from "../stores/drafts/DraftSession";
import { useDraftSessionRegistry } from "../stores/drafts/useDraftSessionRegistry";

const emptySessions: readonly DraftSession[] = [];

export function useDraftSession(notebookId: NotebookId, nodeId: NodeId) {
	const registry = useDraftSessionRegistry();

	// react rerenders when sessions are opened or closed
	const sessions = useSyncExternalStore(
		registry.subscribe,
		registry.getSnapshot,
		() => emptySessions,
	);

	const session = sessions.find(
		(session) => session.notebookId === notebookId && session.nodeId === nodeId,
	);

	// selected session has its own subscription for autosave
	const subscribe = useCallback(
		(listener: () => void) => session?.subscribe(listener) ?? (() => {}),
		[session],
	);
	const getSnapshot = useCallback(() => session?.getSnapshot() ?? null, [session]);

	const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);

	return {
		session,
		status: snapshot?.status ?? "closed",
		isDirty: snapshot?.isDirty ?? false,
		isSaving: snapshot?.status === "saving",
		error: snapshot?.error ?? null,
		saveVersion: snapshot?.saveVersion ?? null,
	};
}
