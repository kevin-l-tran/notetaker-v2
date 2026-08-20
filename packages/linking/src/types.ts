export type LinkTarget = {
	targetId: string;
	phrases: string[];
};

export type SourceEdit = {
	start: number;
	end: number;
	replacement: string;
};

export type SearchableRegion = {
	start: number;
	end: number;
};

export type TextToken = {
	value: string;
	normalized: string;
	start: number;
	end: number;
};

export type AhoCorasickPattern = {
	targetId: string;
	phrase: string;
	tokens: string[];
};

export type AhoCorasickMatch = {
	pattern: AhoCorasickPattern;
	start: number;
	end: number;
};
