import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useQuery } from "@tanstack/react-query";
import { nodeQuery } from "../../../../data/api/queries/nodes";
import ClaimRevisionViewer from "./claims/ClaimRevisionViewer";
import ConceptRevisionViewer from "./concepts/ConceptRevisionViewer";
import styles from "./RevisionViewerPanel.module.css";

type RevisionViewerPanelProps = {
	notebookId: NotebookId;
	nodeId: NodeId;
};

export default function RevisionViewerPanel({ notebookId, nodeId }: RevisionViewerPanelProps) {
	const { isPending, data } = useQuery(nodeQuery(notebookId, nodeId));

	if (isPending) return <p>Loading revision...</p>;

	if (!data?.node.latestRevision) return <p>Error loading revision.</p>;

	return (
		<div className={styles.content}>
			<section className={styles.pane}>
				{data.node.type === "concept" ? (
					<ConceptRevisionViewer revision={data.node.latestRevision} />
				) : (
					<ClaimRevisionViewer revision={data.node.latestRevision} />
				)}
			</section>
		</div>
	);
}
