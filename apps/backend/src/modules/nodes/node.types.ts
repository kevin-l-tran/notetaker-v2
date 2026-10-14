import type { BaseNode, NewBaseNode } from "../../database/schema/baseNodes.ts";
import type { Concept, NewConcept } from "../../database/schema/concepts.ts";

export type NodeData = { baseNode: BaseNode; extension: Concept };

export type CreateConceptData = {
	title: NewBaseNode["title"];
	aliases?: NewBaseNode["aliases"];
	descriptionSource: NewConcept["descriptionSource"];
};

export type UpdateConceptData = {
	title?: NewBaseNode["title"] | undefined;
	aliases?: NewBaseNode["aliases"] | undefined;
	descriptionSource?: NewConcept["descriptionSource"] | undefined;
};

export type CreateNodeData = { type: "concept" } & CreateConceptData;

export type UpdateNodeData = { type: "concept" } & UpdateConceptData;
