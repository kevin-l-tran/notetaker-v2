import { Tabs } from "@base-ui/react";
import { Check, Pencil } from "lucide-react";
import styles from "./NodeEditor.module.css";

/*
 *  Note: add semantic HTML later
 *  For now, CSS classes will serve as element descriptors
 */

export default function NodeEditor() {
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
				<Tabs.Panel value="content">Content</Tabs.Panel>
				<Tabs.Panel value="links">Links</Tabs.Panel>
			</Tabs.Root>
		</div>
	);
}
