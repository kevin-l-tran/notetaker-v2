import type { Literal } from "mdast";

export type LocalLink = Literal & {
	type: "localLink";
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
