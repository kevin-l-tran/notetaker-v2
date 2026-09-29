import EditorSidebar from "../../components/editor/EditorSidebar/EditorSidebar";
import NodeEditor from "../../components/editor/NodeEditor/NodeEditor";
import styles from "./EditorPage.module.css";

export default function EditorPage() {
	return (
		<div className={styles.editorPage}>
			<EditorSidebar />

			<NodeEditor />
		</div>
	);
}
