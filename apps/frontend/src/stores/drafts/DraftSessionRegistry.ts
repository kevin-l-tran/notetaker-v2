import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import type { DraftSession } from "./DraftSession";
import type { DeleteDraftOperation } from "./draftOperationTypes";

type SessionFactory = (notebookId: NotebookId, nodeId: NodeId) => Promise<DraftSession>;
type ClosingOperation = {
	mode: "close" | "discard";
	promise: Promise<void>;
};

export class DraftSessionRegistry {
	private readonly sessions = new Map<string, DraftSession>();
	private readonly opening = new Map<string, Promise<DraftSession>>();
	private readonly closing = new Map<string, ClosingOperation>();
	private readonly listeners = new Set<() => void>();
	private readonly createSession: SessionFactory;
	private readonly deleteDraft: DeleteDraftOperation;
	private closeAllPromise: Promise<void> | null = null;
	private snapshot: readonly DraftSession[] = [];

	constructor(createSession: SessionFactory, deleteDraft: DeleteDraftOperation) {
		this.createSession = createSession;
		this.deleteDraft = deleteDraft;
	}

	private notify = () => {
		this.snapshot = [...this.sessions.values()];
		for (const listener of this.listeners) listener();
	};

	private key = (notebookId: NotebookId, nodeId: NodeId) => {
		return JSON.stringify([notebookId, nodeId]);
	};

	private discardKey = async (key: string): Promise<void> => {
		const pendingClose = this.closing.get(key);
		if (pendingClose) {
			if (pendingClose.mode !== "discard") {
				throw new Error("Cannot close and discard the same draft concurrently");
			}
			return pendingClose.promise;
		}

		const closeSession = async () => {
			const opening = this.opening.get(key);
			if (opening) await opening;

			const session = this.sessions.get(key);
			if (!session) {
				throw new Error("Cannot discard a draft without an open session");
			}

			await session.prepareDiscard();

			try {
				await this.deleteDraft({
					notebookId: session.notebookId,
					nodeId: session.nodeId,
					draftId: session.draftId,
				});
			} catch (error) {
				session.cancelDiscard();
				throw error;
			}
			session.dispose({ discardChanges: true });

			this.sessions.delete(key);
			this.notify();
		};

		const promise = closeSession();
		this.closing.set(key, { mode: "discard", promise });

		try {
			await promise;
		} finally {
			this.closing.delete(key);
		}
	};

	private closeKey = async (key: string): Promise<void> => {
		const pendingClose = this.closing.get(key);
		if (pendingClose) return pendingClose.promise;

		const closeSession = async () => {
			const opening = this.opening.get(key);
			if (opening) await opening;

			const session = this.sessions.get(key);
			if (!session) return;

			await session.flush();
			session.dispose();

			this.sessions.delete(key);
			this.notify();
		};

		const promise = closeSession();
		this.closing.set(key, { mode: "close", promise });

		try {
			await promise;
		} finally {
			this.closing.delete(key);
		}
	};

	getSnapshot = () => this.snapshot;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	get = (notebookId: NotebookId, nodeId: NodeId) => {
		const session = this.sessions.get(this.key(notebookId, nodeId));
		session?.touch();
		return session;
	};

	open = async (notebookId: NotebookId, nodeId: NodeId): Promise<DraftSession> => {
		if (this.closeAllPromise !== null) await this.closeAllPromise;

		const key = this.key(notebookId, nodeId);
		const closing = this.closing.get(key);
		if (closing) await closing.promise;

		const existing = this.get(notebookId, nodeId);
		if (existing) return existing;

		const pending = this.opening.get(key);
		if (pending) return pending;

		const startSession = async () => {
			const session = await this.createSession(notebookId, nodeId);
			session.start();
			this.sessions.set(key, session);
			this.notify();
			return session;
		};

		const promise = startSession();
		this.opening.set(key, promise);

		try {
			return await promise;
		} finally {
			this.opening.delete(key);
		}
	};

	close = (notebookId: NotebookId, nodeId: NodeId): Promise<void> => {
		return this.closeKey(this.key(notebookId, nodeId));
	};

	discard = (notebookId: NotebookId, nodeId: NodeId): Promise<void> => {
		return this.discardKey(this.key(notebookId, nodeId));
	};

	closeAll = (): Promise<void> => {
		if (this.closeAllPromise !== null) return this.closeAllPromise;

		const closeAllSessions = async () => {
			const keys = new Set([...this.sessions.keys(), ...this.opening.keys()]);
			const results = await Promise.allSettled([...keys].map((key) => this.closeKey(key)));
			const errors = results.flatMap((result) =>
				result.status === "rejected" ? [result.reason] : [],
			);
			if (errors.length) throw new AggregateError(errors, "Could not close all draft sessions");
		};

		const promise = closeAllSessions().finally(() => {
			this.closeAllPromise = null;
		});
		this.closeAllPromise = promise;
		return promise;
	};
}
