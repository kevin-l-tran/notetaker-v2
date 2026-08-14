import type { Literal } from "mdast";

export interface LocalLink extends Literal {
    type: "localLink";
    value: string;
    target: string;
}

declare module "mdast" {
    interface RootContentMap {
        localLink: LocalLink;
    }
    interface PhrasingContentMap {
        localLink: LocalLink;
    }
}
