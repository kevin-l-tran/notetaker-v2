import type {
	BaseNodeRevision,
	NewBaseNodeRevision,
} from "../../database/schema/baseNodeRevisions.ts";
import type { Concept, NewConcept } from "../../database/schema/conceptRevisions.ts";

export type NodeData = { baseNode: BaseNodeRevision; extension: Concept };

export type CreateConceptData = {
	title: NewBaseNodeRevision["title"];
	aliases?: NewBaseNodeRevision["aliases"];
	isPublished?: NewBaseNodeRevision["isPublished"];
	descriptionSource: NewConcept["descriptionSource"];
};

export type UpdateConceptData = {
	title?: NewBaseNodeRevision["title"] | undefined;
	aliases?: NewBaseNodeRevision["aliases"] | undefined;
	isPublished?: NewBaseNodeRevision["isPublished"] | undefined;
	descriptionSource?: NewConcept["descriptionSource"] | undefined;
};

export type CreateNodeData = { type: "concept" } & CreateConceptData;

export type UpdateNodeData = { type: "concept" } & UpdateConceptData;
