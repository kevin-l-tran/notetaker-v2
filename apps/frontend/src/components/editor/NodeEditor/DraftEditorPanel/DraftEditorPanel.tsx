import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useDraftSession } from "../../../../hooks/useDraftSession";
import ClaimEditor from "./claims/ClaimEditor";
import ClaimViewer from "./claims/ClaimViewer";
import ConceptEditor from "./concepts/ConceptEditor";
import ConceptViewer from "./concepts/ConceptViewer";
import styles from "./DraftEditorPanel.module.css";

type DraftEditorPanelProps = {
	notebookId: NotebookId;
	nodeId: NodeId;
	nodeType: "concept" | "claim";
};

export default function DraftEditorPanel({ notebookId, nodeId, nodeType }: DraftEditorPanelProps) {
	const { session } = useDraftSession(notebookId, nodeId);

	if (!session) return <p>No draft is open. Select Edit to open one.</p>;

	const Editor = nodeType === "concept" ? ConceptEditor : ClaimEditor;
	const Viewer = nodeType === "concept" ? ConceptViewer : ClaimViewer;

	return (
		<div className={styles.content}>
			<section className={styles.pane}>
				<Editor doc={session.doc} />
			</section>

			<section className={styles.pane}>
				<Viewer doc={session.doc} />
			</section>
		</div>
	);
}
