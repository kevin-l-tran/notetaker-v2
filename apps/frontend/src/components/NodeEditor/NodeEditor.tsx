import { Tabs } from "@base-ui/react";
import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import DocumentEditor from "../DocumentEditor/DocumentEditor";
import DocumentRenderer from "../DocumentRenderer/DocumentRenderer";
import styles from "./NodeEditor.module.css";

/*
 *  Note: add semantic HTML later
 *  For now, CSS classes will serve as element descriptors
 */

interface NodeEditorProps {
	description?: string;
}

export default function NodeEditor({ description = "" }: NodeEditorProps) {
	const [source, setSource] = useState<string>(description);

	return (
		<div className="page">
			<div className={styles.header}>
				<div className={styles.nodeTitle}>
					Node Name
					<Pencil />
				</div>
				<div className={styles.publishStatus}>
					<Check />
					Published
				</div>
			</div>

			<Tabs.Root>
				<Tabs.List>
					<Tabs.Tab value="content">Content</Tabs.Tab>
					<Tabs.Tab value="links">Links</Tabs.Tab>
				</Tabs.List>
				<Tabs.Panel value="content" className={styles.contentPanel}>
					<DocumentEditor initialValue={description} onChange={setSource} />
					<DocumentRenderer source={source} />
				</Tabs.Panel>
				<Tabs.Panel value="links">Links</Tabs.Panel>
			</Tabs.Root>
		</div>
	);
}
