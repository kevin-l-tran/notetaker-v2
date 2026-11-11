import type * as Y from "yjs";
import DocumentEditor from "../../../DocumentEditor/DocumentEditor";
import styles from "../DraftEditorPanel.module.css";

type ClaimEditorProps = {
	doc: Y.Doc;
};

export default function ClaimEditor({ doc }: ClaimEditorProps) {
	return (
		<>
			<div className={styles.paneHeader}>Predicate</div>
			<div className={styles.body}>
				<DocumentEditor yText={doc.getText("predicateSource")} />
			</div>

			<div className={styles.paneHeader}>Result</div>
			<div className={styles.body}>
				<DocumentEditor yText={doc.getText("resultSource")} />
			</div>

			<div className={styles.paneHeader}>Justification</div>
			<div className={styles.body}>
				<DocumentEditor yText={doc.getText("justificationSource")} />
			</div>
		</>
	);
}
