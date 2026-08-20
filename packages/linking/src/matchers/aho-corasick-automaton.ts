import type { AhoCorasickMatch, AhoCorasickPattern, TextToken } from "../types.ts";

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

		for (const parent of queue) {
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

		for (const [i, token] of tokens.entries()) {
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
