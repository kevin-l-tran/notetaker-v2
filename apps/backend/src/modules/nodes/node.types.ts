import type { NewBaseNode } from "../../database/schema/baseNodes.ts";
import type { NewConcept } from "../../database/schema/concepts.ts";

export type CreateConceptData = {
	title: NewBaseNode["title"];
	aliases?: NewBaseNode["aliases"];
	descriptionSource: NewConcept["descriptionSource"];
};

export type UpdateConceptData = {
	title?: NewBaseNode["title"];
	aliases?: NewBaseNode["aliases"];
	descriptionSource?: NewConcept["descriptionSource"];
};

export type CreateNodeData = { type: "concept" } & CreateConceptData;

export type UpdateNodeData = { type: "concept" } & UpdateConceptData;
