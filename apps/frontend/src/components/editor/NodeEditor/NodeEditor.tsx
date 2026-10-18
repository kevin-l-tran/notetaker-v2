import { Tabs } from "@base-ui/react";
import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useQuery } from "@tanstack/react-query";
import {
	AlertCircleIcon,
	CheckIcon,
	FileQuestionIcon,
	FileTextIcon,
	LoaderCircleIcon,
	type LucideIcon,
} from "lucide-react";
import { nodesQuery } from "../../../data/api/queries/nodes";
import NodeContentPanel from "./NodeContentPanel/NodeContentPanel";
import styles from "./NodeEditor.module.css";

type NodeEditorProps = {
	notebookId: NotebookId;
	selectedNodeId?: NodeId;
};

export default function NodeEditor({ notebookId, selectedNodeId }: NodeEditorProps) {
	const { isPending, data, refetch } = useQuery(nodesQuery(notebookId));
	const selectedNode = data?.find((node) => node.id === selectedNodeId);

	const renderState = (Icon: LucideIcon, title: string, description: string, retry = false) => (
		<div className={styles.page}>
			<div className={styles.emptyState}>
				<Icon className={styles.stateIcon} size={24} aria-hidden="true" />
				<h2 className={styles.stateTitle}>{title}</h2>
				<p className={styles.stateDescription}>{description}</p>
				{retry && (
					<button className={styles.action} type="button" onClick={() => void refetch()}>
						Retry
					</button>
				)}
			</div>
		</div>
	);

	if (isPending) return renderState(LoaderCircleIcon, "Loading nodes", "Please wait...");

	if (!data)
		return renderState(
			AlertCircleIcon,
			"Couldn't load nodes",
			"Check your connection and try again.",
			true,
		);

	if (selectedNodeId && !selectedNode)
		return renderState(
			FileQuestionIcon,
			"Node not found",
			"This node may have been deleted. Select another from the sidebar.",
		);

	if (!selectedNode)
		return data.length
			? renderState(
					FileTextIcon,
					"Select a node",
					"Choose a node from the sidebar to start editing.",
				)
			: renderState(FileTextIcon, "No nodes yet", "Create your first node to start writing.");

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<div className={styles.nodeInfo}>
					<div className={styles.nodeTitle}>{selectedNode.title}</div>
					<div className={styles.publishStatus}>
						<CheckIcon size={16} />
						Published
					</div>
				</div>
				<div className={styles.actions}>
					<button className={styles.action} type="button">
						Compile links
					</button>
					<button className={`${styles.action} ${styles.primaryAction}`} type="button">
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
					<NodeContentPanel
						description={selectedNode.type === "concept" ? selectedNode.descriptionSource : ""}
					/>
				</Tabs.Panel>
				<Tabs.Panel value="links">Links</Tabs.Panel>
			</Tabs.Root>
		</div>
	);
}
