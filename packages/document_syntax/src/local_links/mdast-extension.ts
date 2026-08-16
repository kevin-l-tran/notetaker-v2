import type { CompileContext, Extension, Handle } from "mdast-util-from-markdown";
import type { Node } from "unist";

import { localLinkTokens } from "./tokens.ts";
import type { LocalLink } from "./types.ts";

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

	node.value = this.sliceSerialize(token);
};

const exitLocalLinkTarget: Handle = function (token) {
	const node = currentLocalLink(this);

	node.target = this.sliceSerialize(token);
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
