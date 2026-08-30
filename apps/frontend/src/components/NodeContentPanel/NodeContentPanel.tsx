import { useState } from "react";
import DocumentEditor from "../DocumentEditor/DocumentEditor";
import DocumentRenderer from "../DocumentRenderer/DocumentRenderer";
import styles from "./NodeContentPanel.module.css";

interface NodeContentPanelProps {
	description?: string;
}

export default function NodeContentPanel({ description = "" }: NodeContentPanelProps) {
	const [source, setSource] = useState<string>(description);

	return (
		<div className={styles.contentPanel}>
			<DocumentEditor initialValue={description} onChange={setSource} />
			<DocumentRenderer source={source} />
		</div>
	);
}
