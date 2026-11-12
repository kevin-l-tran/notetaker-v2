import type * as Y from "yjs";
import { useYTextValue } from "../../../../../hooks/useYTextValue";
import DocumentRenderer from "../../../DocumentRenderer/DocumentRenderer";
import styles from "../DraftEditorPanel.module.css";

type ClaimViewerProps = {
	doc: Y.Doc;
};

export default function ClaimViewer({ doc }: ClaimViewerProps) {
	const predicate = useYTextValue(doc.getText("predicateSource"));
	const result = useYTextValue(doc.getText("resultSource"));
	const justification = useYTextValue(doc.getText("justificationSource"));

	const claim = `${predicate.trim()} ${result.trim()}`;

	return (
		<>
			<div className={styles.paneHeader}>Claim</div>
			<div className={styles.body}>
				<DocumentRenderer source={claim} />
			</div>

			<div className={styles.paneHeader}>Justification</div>
			<div className={styles.body}>
				<DocumentRenderer source={justification} />
			</div>
		</>
	);
}
