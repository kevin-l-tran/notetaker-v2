export type LinkTargets = {
	targetId: string;
	phrases: string[];
}[];

export type SourceEdit = {
	start: number;
	end: number;
	replacement: string;
};
