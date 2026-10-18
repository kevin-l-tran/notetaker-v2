import EditorSidebar from "../../components/editor/EditorSidebar/EditorSidebar";
import NodeEditor from "../../components/editor/NodeEditor/NodeEditor";
import type { Route } from "./+types/EditorPage";
import styles from "./EditorPage.module.css";

export default function EditorPage({ params }: Route.ComponentProps) {
	return (
		<div className={styles.editorPage}>
			<EditorSidebar notebookId={params.notebookId} selectedNodeId={params.nodeId} />

			<NodeEditor notebookId={params.notebookId} selectedNodeId={params.nodeId} />
		</div>
	);
}
