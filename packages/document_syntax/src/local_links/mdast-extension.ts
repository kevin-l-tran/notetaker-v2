import type { CompileContext, Extension, Handle } from "mdast-util-from-markdown";
import type { Node } from "unist";

import { localLinkTokens } from "./tokens.ts";
import type { LocalLink } from "./types.ts";

export const ESCAPABLE_TOKENS = ["\\", "|", "[", "]", "!", "~"];

export function localLinkFromMarkdown(): Extension {
	return {
		enter: {
			[localLinkTokens.link]: enterLocalLink,
		},
		exit: {
			[localLinkTokens.marker]: exitLocalLinkMarker,
			[localLinkTokens.label]: exitLocalLinkLabel,
			[localLinkTokens.target]: exitLocalLinkTarget,
			[localLinkTokens.link]: exitLocalLink,
		},
	};
}

const enterLocalLink: Handle = function (token) {
	const node: LocalLink = {
		type: "localLink",
		mode: "manual",
		value: "",
		target: "",
	};

	this.enter(node, token);
};

const exitLocalLinkMarker: Handle = function (token) {
	const node = currentLocalLink(this);

	const markerText = this.sliceSerialize(token);
	if (markerText.includes("!")) {
		node.mode = "suppressed";
	} else if (markerText.includes("~")) {
		node.mode = "automatic";
	}
};

const exitLocalLinkLabel: Handle = function (token) {
	const node = currentLocalLink(this);

	const label = this.sliceSerialize(token);

	let newLabel = "";
	let isNextEscaped = false;
	for (const char of label) {
		if (isNextEscaped) {
			if (!ESCAPABLE_TOKENS.includes(char)) newLabel += "\\";

			newLabel += char;
			isNextEscaped = false;
		} else if (!isNextEscaped && char === "\\") {
			isNextEscaped = true;
		} else {
			newLabel += char;
		}
	}

	node.value = newLabel;
};

const exitLocalLinkTarget: Handle = function (token) {
	const node = currentLocalLink(this);

	const target = this.sliceSerialize(token);

	let newTarget = "";
	let isNextEscaped = false;
	for (const char of target) {
		if (isNextEscaped) {
			if (!ESCAPABLE_TOKENS.includes(char)) newTarget += "\\";

			newTarget += char;
			isNextEscaped = false;
		} else if (!isNextEscaped && char === "\\") {
			isNextEscaped = true;
		} else {
			newTarget += char;
		}
	}

	node.target = newTarget;
};

const exitLocalLink: Handle = function (token) {
	this.exit(token);
};

function currentLocalLink(context: CompileContext): LocalLink {
	const node = context.stack[context.stack.length - 1];

	if (!isLocalLink(node)) {
		throw new Error("Expected current node to be a definition link");
	}

	return node;
}

function isLocalLink(node: Node | undefined): node is LocalLink {
	return node?.type === "localLink";
}
