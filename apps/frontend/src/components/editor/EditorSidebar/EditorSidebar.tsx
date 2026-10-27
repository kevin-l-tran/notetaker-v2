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
	const { data } = useQuery(nodesQuery(notebookId));

	return (
		<aside className={styles.sidebar}>
			<Input className={styles.search} placeholder="Search nodes..." />

			<div className={styles.nodeList}>
				{data?.map((node) => (
					<NavLink
						key={node.id}
						to={`/notebooks/${notebookId}/edit/${node.id}`}
						className={
							node.id === selectedNodeId ? `${styles.node} ${styles.selected}` : styles.node
						}
					>
						{node?.latestRevision?.title ?? "New draft"}
					</NavLink>
				))}
			</div>

			<Button className={styles.newButton}>+ New node</Button>
		</aside>
	);
}
