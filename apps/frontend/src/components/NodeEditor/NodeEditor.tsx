import { Tabs } from "@base-ui/react";
import { Check, Pencil } from "lucide-react";
import styles from "./NodeEditor.module.css";
import NodeContentPanel from "../NodeContentPanel/NodeContentPanel";

/*
 *  Note: add semantic HTML later
 *  For now, CSS classes will serve as element descriptors
 */

interface NodeEditorProps {
	description?: string;
}

export default function NodeEditor({ description = "" }: NodeEditorProps) {

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
					<NodeContentPanel description={description} />
				</Tabs.Panel>
				<Tabs.Panel value="links">Links</Tabs.Panel>
			</Tabs.Root>
		</div>
	);
}
