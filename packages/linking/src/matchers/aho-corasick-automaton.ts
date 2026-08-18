import type { TextToken } from "../types.ts";

export type AhoCorasickPattern = {
	targetId: string;
	phrase: string;
	tokens: [string, ...string[]];
};

export type AhoCorasickMatch = {
	pattern: AhoCorasickPattern;
	start: number;
	end: number;
};

class AhoCorasickNode {
	readonly next = new Map<string, AhoCorasickNode>();
	output: AhoCorasickPattern[];
	suffix: AhoCorasickNode;

	constructor(suffix?: AhoCorasickNode) {
		this.output = [];
		this.suffix = suffix ?? this;
	}
}

export class AhoCorasickAutomaton {
	private root: AhoCorasickNode;

	constructor(patterns: AhoCorasickPattern[]) {
		this.root = this.build(patterns);
	}

	build(patterns: AhoCorasickPattern[]) {
		const root = makeTrie(patterns);
		root.suffix = root;

		const queue: AhoCorasickNode[] = [];
		for (const firstDescendents of root.next.values()) {
			firstDescendents.suffix = root;
			queue.push(firstDescendents);
		}

		while (queue.length) {
			const parent = queue.shift();
			if (!parent) {
				throw new Error("Expected queue to not be empty");
			}

			for (const [transition, child] of parent.next.entries()) {
				let fallback = parent.suffix;

				while (fallback !== root && !fallback.next.get(transition)) {
					fallback = fallback.suffix;
				}

				child.suffix = fallback.next.get(transition) ?? root;
				child.output.push(...child.suffix.output);

				queue.push(child);
			}
		}

		return root;
	}

	search(tokens: TextToken[]) {
		const matches: AhoCorasickMatch[] = [];
		let state = this.root;

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token === undefined) {
				throw new Error("Expected tokens[i] to be defined");
			}

			const transition = token.normalized;

			while (state !== this.root && !state.next.get(transition)) {
				state = state.suffix;
			}

			const nextTransition = state.next.get(transition);
			if (nextTransition) {
				state = nextTransition;
			} else {
				state = this.root;
			}

			for (const pattern of state.output) {
				const startTokenIndex = i - pattern.tokens.length + 1;

				const start = tokens[startTokenIndex]?.start;
				const end = tokens[i]?.end;

				if (start === undefined || end === undefined) {
					throw new Error("Expected start or end tokens to be defined");
				}

				matches.push({ pattern, start, end });
			}
		}

		return matches;
	}
}

function makeTrie(patterns: AhoCorasickPattern[]) {
	const root: AhoCorasickNode = new AhoCorasickNode();

	for (const pattern of patterns) {
		let currentNode = root;

		for (const word of pattern.tokens) {
			let nextNode = currentNode.next.get(word);

			if (nextNode === undefined) {
				nextNode = new AhoCorasickNode();

				currentNode.next.set(word, nextNode);
			}

			currentNode = nextNode;
		}

		currentNode.output.push(pattern);
	}

	return root;
}
