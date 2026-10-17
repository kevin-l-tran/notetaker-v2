import { useState } from "react";
import DocumentEditor from "./DocumentEditor/DocumentEditor";
import DocumentRenderer from "./DocumentRenderer/DocumentRenderer";
import styles from "./NodeContentPanel.module.css";

type NodeContentPanelProps = {
	description?: string;
};

export default function NodeContentPanel({ description = "" }: NodeContentPanelProps) {
	const [source, setSource] = useState<string>(description);

	return (
		<div className={styles.content}>
			<section className={styles.pane}>
				<div className={styles.paneHeader}>Description</div>
				<div className={styles.body}>
					<DocumentEditor initialValue={description} onChange={setSource} />
				</div>
			</section>

			<section className={styles.pane}>
				<div className={styles.paneHeader}>Preview</div>
				<div className={styles.body}>
					<DocumentRenderer source={source} />
				</div>
			</section>
		</div>
	);
}
