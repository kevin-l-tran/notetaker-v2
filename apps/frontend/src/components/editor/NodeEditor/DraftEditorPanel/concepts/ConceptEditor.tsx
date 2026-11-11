import type * as Y from "yjs";
import DocumentEditor from "../../../DocumentEditor/DocumentEditor";
import styles from "../DraftEditorPanel.module.css";

type ConceptEditorProps = {
	doc: Y.Doc;
};

export default function ConceptEditor({ doc }: ConceptEditorProps) {
	return (
		<>
			<div className={styles.paneHeader}>Description</div>
			<div className={styles.body}>
				<DocumentEditor yText={doc.getText("descriptionSource")} />
			</div>
		</>
	);
}
