import SkeletonNotebookRow from "./NotebookRow/SkeletonNotebookRow";

export default function NotebooksSkeleton() {
	return (
		<div aria-hidden="true">
			{[1, 2, 3].map((row) => (
				<SkeletonNotebookRow key={row} />
			))}
		</div>
	);
}
