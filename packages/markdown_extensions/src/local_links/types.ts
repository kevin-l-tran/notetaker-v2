import "micromark-util-types";
import type { Literal } from "mdast";

export type LocalLink = Literal & {
	type: "localLink";
	mode: "manual" | "automatic" | "suppressed";
	value: string;
	target: string;
};

declare module "mdast" {
	interface RootContentMap {
		localLink: LocalLink;
	}
	interface PhrasingContentMap {
		localLink: LocalLink;
	}
}

declare module "micromark-util-types" {
	interface TokenTypeMap {
		localLink: "localLink";
		localLinkMarker: "localLinkMarker";
		localLinkLabel: "localLinkLabel";
		localLinkTarget: "localLinkTarget";
	}
}
