import DocumentEditor from "../../../DocumentEditor/DocumentEditor";
import styles from "../DraftEditorPanel.module.css";

export default function ConceptEditor({}) {
	return (
		<>
			<div className={styles.paneHeader}>Description</div>
			<div className={styles.body}>
				<DocumentEditor initialValue={description} onChange={setSource} />
			</div>
		</>
	);
}
