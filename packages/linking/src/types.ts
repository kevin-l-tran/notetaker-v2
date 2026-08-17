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
