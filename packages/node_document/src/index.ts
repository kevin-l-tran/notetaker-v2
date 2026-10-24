import {
	type Alias,
	type DraftClaimContent,
	DraftClaimContentSchema,
	type DraftConceptContent,
	DraftConceptContentSchema,
	type ExcludedAlias,
	type PublishableClaimContent,
	PublishableClaimContentSchema,
	type PublishableConceptContent,
	PublishableConceptContentSchema,
} from "@notetaker-v2/contracts";
import * as Y from "yjs";

export type NodeType = "concept" | "claim";

export type PublishableNodeContent =
	| ({ type: "concept" } & PublishableConceptContent)
	| ({ type: "claim" } & PublishableClaimContent);

export type DraftNodeContent =
	| ({ type: "concept" } & DraftConceptContent)
	| ({ type: "claim" } & DraftClaimContent);

export function encodeDocument(doc: Y.Doc): Uint8Array {
	return Y.encodeStateAsUpdate(doc);
}

export function decodeDocument(state: Uint8Array): Y.Doc {
	const doc = new Y.Doc();

	try {
		Y.applyUpdate(doc, state);
		return doc;
	} catch (error) {
		doc.destroy();
		throw error;
	}
}

export function assertNodeDocument(doc: Y.Doc, expectedType: NodeType): void {
	const actualType = doc.getMap("metadata").get("nodeType");

	if (actualType !== expectedType) {
		throw new Error("Invalid node document type.");
	}
}

export function createEmptyNodeDocument(type: NodeType, title = ""): Y.Doc {
	const doc = new Y.Doc();
	doc.getMap("metadata").set("nodeType", type);
	doc.getText("title").insert(0, title);
	doc.getArray<Alias>("aliases");
	doc.getArray<ExcludedAlias>("excludedAliases");

	if (type === "concept") {
		doc.getText("descriptionSource");
	} else {
		doc.getText("predicateSource");
		doc.getText("resultSource");
		doc.getText("justificationSource");
	}

	return doc;
}

export function createDocumentFromRevision(revision: PublishableNodeContent): Y.Doc {
	const doc = createEmptyNodeDocument(revision.type, revision.title);
	doc.getArray<Alias>("aliases").push(revision.aliases);
	doc.getArray<ExcludedAlias>("excludedAliases").push(revision.excludedAliases);

	if (revision.type === "concept") {
		doc.getText("descriptionSource").insert(0, revision.descriptionSource);
	} else {
		doc.getText("predicateSource").insert(0, revision.predicateSource);
		doc.getText("resultSource").insert(0, revision.resultSource);
		doc.getText("justificationSource").insert(0, revision.justificationSource);
	}

	return doc;
}

export function extractPublishableContent(doc: Y.Doc, type: NodeType): PublishableNodeContent {
	assertNodeDocument(doc, type);

	const base = {
		title: doc.getText("title").toString(),
		aliases: doc.getArray<Alias>("aliases").toArray(),
		excludedAliases: doc.getArray<ExcludedAlias>("excludedAliases").toArray(),
	};

	if (type === "concept") {
		return {
			type,
			...PublishableConceptContentSchema.parse({
				...base,
				descriptionSource: doc.getText("descriptionSource").toString(),
			}),
		};
	}

	return {
		type,
		...PublishableClaimContentSchema.parse({
			...base,
			predicateSource: doc.getText("predicateSource").toString(),
			resultSource: doc.getText("resultSource").toString(),
			justificationSource: doc.getText("justificationSource").toString(),
		}),
	};
}

export function extractDraftContent(doc: Y.Doc, type: NodeType): DraftNodeContent {
	assertNodeDocument(doc, type);

	const base = {
		title: doc.getText("title").toString(),
		aliases: doc.getArray<Alias>("aliases").toArray(),
		excludedAliases: doc.getArray<ExcludedAlias>("excludedAliases").toArray(),
	};

	if (type === "concept") {
		return {
			type,
			...DraftConceptContentSchema.parse({
				...base,
				descriptionSource: doc.getText("descriptionSource").toString(),
			}),
		};
	}

	return {
		type,
		...DraftClaimContentSchema.parse({
			...base,
			predicateSource: doc.getText("predicateSource").toString(),
			resultSource: doc.getText("resultSource").toString(),
			justificationSource: doc.getText("justificationSource").toString(),
		}),
	};
}
