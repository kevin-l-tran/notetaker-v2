import type * as Y from "yjs";
import { useYTextValue } from "../../../../../hooks/useYTextValue";
import DocumentRenderer from "../../../DocumentRenderer/DocumentRenderer";
import styles from "../DraftEditorPanel.module.css";

type ConceptViewerProps = {
	doc: Y.Doc;
};

export default function ConceptViewer({ doc }: ConceptViewerProps) {
	const descriptionSource = useYTextValue(doc.getText("descriptionSource"));

	return (
		<>
			<div className={styles.paneHeader}>Description</div>
			<div className={styles.body}>
				<DocumentRenderer source={descriptionSource} />
			</div>
		</>
	);
}
