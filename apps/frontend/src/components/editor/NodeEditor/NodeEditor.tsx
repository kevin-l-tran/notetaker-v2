import { Tabs } from "@base-ui/react";
import { CheckIcon } from "lucide-react";
import NodeContentPanel from "./NodeContentPanel/NodeContentPanel";
import styles from "./NodeEditor.module.css";

type NodeEditorProps = {
	description?: string;
	onSave?: () => void;
	onCompileLinks?: () => void;
};

export default function NodeEditor({ description = "", onSave, onCompileLinks }: NodeEditorProps) {
	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<div className={styles.nodeInfo}>
					<div className={styles.nodeTitle}>Node Name</div>
					<div className={styles.publishStatus}>
						<CheckIcon size={16} />
						Published
					</div>
				</div>
				<div className={styles.actions}>
					<button
						className={styles.action}
						type="button"
						onClick={onCompileLinks}
						disabled={!onCompileLinks}
					>
						Compile links
					</button>
					<button
						className={`${styles.action} ${styles.primaryAction}`}
						type="button"
						onClick={onSave}
						disabled={!onSave}
					>
						Save
					</button>
				</div>
			</div>

			<Tabs.Root defaultValue="content" className={styles.tabs}>
				<Tabs.List className={styles.tabList}>
					<Tabs.Tab value="content" className={styles.tab}>
						Content
					</Tabs.Tab>
					<Tabs.Tab value="links" className={styles.tab}>
						Links
					</Tabs.Tab>
				</Tabs.List>
				<Tabs.Panel value="content" className={styles.contentPanel}>
					<NodeContentPanel description={description} />
				</Tabs.Panel>
				<Tabs.Panel value="links">Links</Tabs.Panel>
			</Tabs.Root>
		</div>
	);
}
