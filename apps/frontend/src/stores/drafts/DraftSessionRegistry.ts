import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import type { DraftSession } from "./DraftSession";

type SessionFactory = (notebookId: NotebookId, nodeId: NodeId) => Promise<DraftSession>;

export class DraftSessionRegistry {
	private readonly sessions = new Map<string, DraftSession>();
	private readonly opening = new Map<string, Promise<DraftSession>>();
	private readonly closing = new Map<string, Promise<void>>();
	private readonly listeners = new Set<() => void>();
	private readonly createSession: SessionFactory;
	private closeAllPromise: Promise<void> | null = null;
	private snapshot: readonly DraftSession[] = [];

	constructor(createSession: SessionFactory) {
		this.createSession = createSession;
	}

	private notify = () => {
		this.snapshot = [...this.sessions.values()];
		for (const listener of this.listeners) listener();
	};

	private key = (notebookId: NotebookId, nodeId: NodeId) => {
		return JSON.stringify([notebookId, nodeId]);
	};

	private closeKey = async (key: string): Promise<void> => {
		const pendingClose = this.closing.get(key);
		if (pendingClose) return pendingClose;

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
		this.closing.set(key, promise);

		try {
			return await promise;
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

		if (this.closing.has(key)) await this.closing.get(key);

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
