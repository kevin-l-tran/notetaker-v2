import { Button, Tabs } from "@base-ui/react";
import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, CheckIcon, FileIcon, FileQuestionIcon } from "lucide-react";
import { nodesQuery } from "../../../data/api/queries/nodes";
import LoadingIcon from "../../shared/LoadingIcon/LoadingIcon";
import NodeContentPanel from "./NodeContentPanel/NodeContentPanel";
import styles from "./NodeEditor.module.css";

type NodeEditorProps = {
	notebookId: NotebookId;
	selectedNodeId?: NodeId;
};

export default function NodeEditor({ notebookId, selectedNodeId }: NodeEditorProps) {
	const { isPending, data, refetch } = useQuery(nodesQuery(notebookId));
	const selectedNode = data?.find((node) => node.id === selectedNodeId);

	if (isPending)
		return (
			<div className={styles.page}>
				<div className={styles.emptyState}>
					<LoadingIcon
						className={styles.stateIcon}
						data-loading={isPending}
						size={24}
						aria-hidden="true"
					/>
					<h2 className={styles.stateTitle}>Loading nodes</h2>
					<p className={styles.stateDescription}>Please wait...</p>
				</div>
			</div>
		);

	if (!data)
		return (
			<div className={styles.page}>
				<div className={styles.emptyState}>
					<AlertCircleIcon
						className={styles.stateIcon}
						data-loading={isPending}
						size={24}
						aria-hidden="true"
					/>
					<h2 className={styles.stateTitle}>Couldn't load nodes</h2>
					<p className={styles.stateDescription}>Check your connection and try again.</p>
					<Button className={styles.action} type="button" onClick={() => void refetch()}>
						Retry
					</Button>
				</div>
			</div>
		);

	if (selectedNodeId && !selectedNode)
		return (
			<div className={styles.page}>
				<div className={styles.emptyState}>
					<FileQuestionIcon
						className={styles.stateIcon}
						data-loading={isPending}
						size={24}
						aria-hidden="true"
					/>
					<h2 className={styles.stateTitle}>Node not found</h2>
					<p className={styles.stateDescription}>
						This node may have been deleted. Select another from the sidebar.
					</p>
				</div>
			</div>
		);

	if (!selectedNode)
		return (
			<div className={styles.page}>
				<div className={styles.emptyState}>
					<FileIcon
						className={styles.stateIcon}
						data-loading={isPending}
						size={24}
						aria-hidden="true"
					/>
					<h2 className={styles.stateTitle}>{data.length ? "Select a node" : "No nodes yet"}</h2>
					<p className={styles.stateDescription}>
						{data.length
							? "Choose a node from the sidebar to start editing."
							: "Create your first node to start writing."}
					</p>
				</div>
			</div>
		);

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<div className={styles.nodeInfo}>
					<div className={styles.nodeTitle}>
						{selectedNode?.latestRevision?.title ?? "New draft"}
					</div>
					<div className={styles.publishStatus}>
						<CheckIcon size={16} />
						Published
					</div>
				</div>
				<div className={styles.actions}>
					<Button className={styles.action} type="button">
						Compile links
					</Button>
					<Button className={`${styles.action} ${styles.primaryAction}`} type="button">
						Save
					</Button>
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
						description={
							selectedNode.type === "concept" ? selectedNode?.latestRevision?.descriptionSource : ""
						}
					/>
				</Tabs.Panel>
				<Tabs.Panel value="links">Links</Tabs.Panel>
			</Tabs.Root>
		</div>
	);
}
