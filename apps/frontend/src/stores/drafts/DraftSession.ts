import type { NodeDraftId, NodeId, NotebookId } from "@notetaker-v2/contracts";
import { encodeDocument } from "@notetaker-v2/node_document";
import type * as Y from "yjs";
import { ApiError } from "../../data/api/errors";
import { saveDraft } from "../../data/api/nodeDrafts";

type DraftSessionOptions = {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
	doc: Y.Doc;
	initialSaveVersion: number;
};

type DraftSessionStatus = "idle" | "saving" | "error";

export type DraftSessionSnapshot = {
	status: DraftSessionStatus;
	error: Error | null;
	isDirty: boolean;
	saveVersion: number;
};

export class DraftSession {
	readonly notebookId: NotebookId;
	readonly nodeId: NodeId;
	readonly draftId: NodeDraftId;
	readonly doc: Y.Doc;

	lastAccessedAt = Date.now();

	private saveVersion: number;
	private changeVersion = 0;
	private savedChangeVersion = 0;
	private activeSave: Promise<number> | null = null;
	private timeoutId: ReturnType<typeof setInterval> | null = null;
	private error: Error | null = null;
	private status: DraftSessionStatus = "idle";
	private disposed = false;
	private listeners = new Set<() => void>();
	private snapshot: DraftSessionSnapshot;

	constructor({ notebookId, nodeId, draftId, doc, initialSaveVersion }: DraftSessionOptions) {
		this.notebookId = notebookId;
		this.nodeId = nodeId;
		this.draftId = draftId;
		this.doc = doc;
		this.saveVersion = initialSaveVersion;
		this.snapshot = this.makeSnapshot();
	}

	private makeSnapshot = (): DraftSessionSnapshot => {
		return {
			status: this.status,
			error: this.error,
			isDirty: this.changeVersion !== this.savedChangeVersion,
			saveVersion: this.saveVersion,
		};
	};

	private notify = () => {
		this.snapshot = this.makeSnapshot();
		for (const listener of this.listeners) listener();
	};

	private onUpdate = () => {
		this.changeVersion += 1;
		if (!this.snapshot.isDirty) this.notify();
	};

	getSnapshot = (): DraftSessionSnapshot => this.snapshot;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	start = () => {
		if (this.disposed) throw new Error("Draft session has been disposed");
		if (this.timeoutId !== null) return;

		this.doc.on("update", this.onUpdate);
		this.timeoutId = setInterval(() => {
			void this.save().catch(() => {});
		}, 3000);
	};

	save = (): Promise<number> => {
		if (this.disposed) return Promise.reject(new Error("Draft session has been disposed"));
		if (this.activeSave !== null) return this.activeSave;

		// a stale save version cannot be fixed by retrying the same snapshot.
		if (this.error instanceof ApiError && this.error.status === 409) {
			return Promise.reject(this.error);
		}

		if (this.changeVersion === this.savedChangeVersion) {
			return Promise.resolve(this.saveVersion);
		}

		const savingChangeVersion = this.changeVersion;
		const expectedSaveVersion = this.saveVersion;

		let stateString = "";
		const bytes = encodeDocument(this.doc);
		// we can't spread bytes into String.fromCharCode since it may exceed
		// the maximum number of function arguments.
		for (const byte of bytes) {
			stateString += String.fromCharCode(byte);
		}
		const state = btoa(stateString);

		this.status = "saving";
		this.error = null;
		this.notify();

		const promise = saveDraft({
			notebookId: this.notebookId,
			nodeId: this.nodeId,
			draftId: this.draftId,
			input: { expectedSaveVersion, state },
		})
			.then((newDraft) => {
				this.saveVersion = newDraft.saveVersion;
				this.savedChangeVersion = savingChangeVersion;
				this.status = "idle";
				this.notify();
				return newDraft.saveVersion;
			})
			.catch((error: unknown) => {
				this.error = error instanceof Error ? error : new Error(String(error));
				this.status = "error";
				this.notify();
				throw this.error;
			})
			.finally(() => {
				this.activeSave = null;
			});

		this.activeSave = promise;
		return promise;
	};

	flush = async (): Promise<number> => {
		while (this.activeSave || this.changeVersion !== this.savedChangeVersion) {
			await this.save();
		}
		return this.saveVersion;
	};

	touch = () => {
		this.lastAccessedAt = Date.now();
	};

	dispose = ({ discardChanges = false }: { discardChanges?: boolean } = {}) => {
		if (this.disposed) return;
		if (this.activeSave !== null) throw new Error("Cannot dispose while a save is in progress");
		if (!discardChanges && this.changeVersion !== this.savedChangeVersion) {
			throw new Error("Cannot dispose a draft with unsaved changes");
		}

		if (this.timeoutId !== null) {
			clearInterval(this.timeoutId);
			this.timeoutId = null;
			this.doc.off("update", this.onUpdate);
		}
		this.disposed = true;
		this.listeners.clear();
		this.doc.destroy();
	};
}
