import type { ClaimRevision } from "@notetaker-v2/contracts";
import DocumentRenderer from "../../../DocumentRenderer/DocumentRenderer";
import styles from "../RevisionViewerPanel.module.css";

type ClaimRevisionViewerProps = {
	revision: ClaimRevision;
};

export default function ClaimRevisionViewer({ revision }: ClaimRevisionViewerProps) {
	const claimSource = `${revision.predicateSource.trim()} ${revision.resultSource.trim()}`;

	return (
		<>
			<div className={styles.paneHeader}>Claim</div>
			<div className={styles.body}>
				<DocumentRenderer source={claimSource} />
			</div>

			<div className={styles.paneHeader}>Justification</div>
			<div className={styles.body}>
				<DocumentRenderer source={revision.justificationSource} />
			</div>
		</>
	);
}
