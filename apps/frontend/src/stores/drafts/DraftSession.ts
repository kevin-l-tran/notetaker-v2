import type { NodeDraftId, NodeId, NotebookId } from "@notetaker-v2/contracts";
import { encodeDocument } from "@notetaker-v2/node_document";
import type * as Y from "yjs";
import type { SaveDraftOperation } from "./draftOperationTypes";

type DraftSessionOptions = {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
	doc: Y.Doc;
	initialSaveVersion: number;
	saveDraft: SaveDraftOperation;
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

	private readonly persistDraft: SaveDraftOperation;
	private saveVersion: number;
	private changeVersion = 0;
	private savedChangeVersion = 0;
	private activeSave: Promise<number> | null = null;
	private timeoutId: ReturnType<typeof setInterval> | null = null;
	private observing = false;
	private discarding = false;
	private error: Error | null = null;
	private status: DraftSessionStatus = "idle";
	private disposed = false;
	private listeners = new Set<() => void>();
	private snapshot: DraftSessionSnapshot;

	constructor({
		notebookId,
		nodeId,
		draftId,
		doc,
		initialSaveVersion,
		saveDraft,
	}: DraftSessionOptions) {
		this.notebookId = notebookId;
		this.nodeId = nodeId;
		this.draftId = draftId;
		this.doc = doc;
		this.saveVersion = initialSaveVersion;
		this.persistDraft = saveDraft;
		this.snapshot = this.makeSnapshot();
	}

	private makeSnapshot = (): DraftSessionSnapshot => ({
		status: this.status,
		error: this.error,
		isDirty: this.changeVersion !== this.savedChangeVersion,
		saveVersion: this.saveVersion,
	});

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
		if (this.discarding) throw new Error("Cannot restart a draft being discarded");
		if (!this.observing) {
			this.doc.on("update", this.onUpdate);
			this.observing = true;
		}
		if (this.timeoutId !== null) return;
		this.timeoutId = setInterval(() => {
			void this.save().catch(() => {});
		}, 3000);
	};

	stop = () => {
		if (this.timeoutId !== null) {
			clearInterval(this.timeoutId);
			this.timeoutId = null;
		}
	};

	save = (): Promise<number> => {
		if (this.disposed) return Promise.reject(new Error("Draft session has been disposed"));
		if (this.discarding) return Promise.reject(new Error("Draft is being discarded"));
		if (this.activeSave !== null) return this.activeSave;

		if (this.changeVersion === this.savedChangeVersion) {
			return Promise.resolve(this.saveVersion);
		}

		const savingChangeVersion = this.changeVersion;
		const expectedSaveVersion = this.saveVersion;

		let stateString = "";
		const bytes = encodeDocument(this.doc);
		for (const byte of bytes) stateString += String.fromCharCode(byte);
		const state = btoa(stateString);

		this.status = "saving";
		this.error = null;
		this.notify();

		const promise = this.persistDraft({
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

	prepareDiscard = async (): Promise<void> => {
		if (this.disposed) throw new Error("Draft session has been disposed");
		this.discarding = true;
		this.stop();
		try {
			await this.activeSave;
		} catch {
			// a failed earlier save does not prevent deletion of the draft.
		}
	};

	cancelDiscard = () => {
		if (this.disposed || !this.discarding) return;
		this.discarding = false;
		this.start();
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

		this.stop();

		if (this.observing) {
			this.doc.off("update", this.onUpdate);
			this.observing = false;
		}
		this.disposed = true;
		this.listeners.clear();
		this.doc.destroy();
	};
}
