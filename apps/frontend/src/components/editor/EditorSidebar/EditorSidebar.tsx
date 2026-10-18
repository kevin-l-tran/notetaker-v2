import { Button, Input } from "@base-ui/react";
import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router";
import { nodesQuery } from "../../../data/api/queries/nodes";
import styles from "./EditorSidebar.module.css";

type EditorSidebarProps = {
	notebookId: NotebookId;
	selectedNodeId?: NodeId;
};

export default function EditorSidebar({ notebookId, selectedNodeId }: EditorSidebarProps) {
	const { isPending, data, refetch } = useQuery(nodesQuery(notebookId));

	const renderNodeList = () => {
		if (isPending) return <div className={styles.listState}>Loading nodes...</div>;

		if (!data)
			return (
				<div className={styles.listState}>
					<strong className={styles.listTitle}>Couldn't load nodes</strong>
					<span>Check your connection and try again.</span>
					<button type="button" className={styles.retry} onClick={() => void refetch()}>
						Retry
					</button>
				</div>
			);

		return data.map((node) => (
			<NavLink
				key={node.id}
				to={`/notebooks/${notebookId}/edit/${node.id}`}
				className={node.id === selectedNodeId ? `${styles.node} ${styles.selected}` : styles.node}
			>
				{node.title}
			</NavLink>
		));
	};

	return (
		<aside className={styles.sidebar}>
			<Input className={styles.search} placeholder="Search nodes..." disabled={!data?.length} />

			<div className={styles.nodeList}>{renderNodeList()}</div>

			<Button className={styles.newButton}>+ New node</Button>
		</aside>
	);
}
