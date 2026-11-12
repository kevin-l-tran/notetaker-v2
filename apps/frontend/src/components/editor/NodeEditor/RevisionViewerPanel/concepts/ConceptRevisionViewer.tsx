import type { ConceptRevision } from "@notetaker-v2/contracts";
import DocumentRenderer from "../../../DocumentRenderer/DocumentRenderer";
import styles from "../RevisionViewerPanel.module.css";

type ConceptRevisionViewerProps = {
	revision: ConceptRevision;
};

export default function ConceptRevisionViewer({ revision }: ConceptRevisionViewerProps) {
	return (
		<>
			<div className={styles.paneHeader}>Description</div>
			<div className={styles.body}>
				<DocumentRenderer source={revision.descriptionSource} />
			</div>
		</>
	);
}
