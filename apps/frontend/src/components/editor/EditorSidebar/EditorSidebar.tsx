import { Button, Input } from "@base-ui/react";
import styles from "./EditorSidebar.module.css";

export default function EditorSidebar() {
	return (
		<aside className={styles.sidebar}>
			<Input className={styles.search} placeholder="Search concepts..." />

			<div className={styles.nodeList}>
				<div className={`${styles.node} ${styles.selected}`}>Item 1</div>
				<div className={styles.node}>Item 2</div>
				<div className={styles.node}>Item 3</div>
				<div className={styles.node}>Item 4</div>
				<div className={styles.node}>Item 5</div>
			</div>

			<Button className={styles.newButton}>+ New Definition</Button>
		</aside>
	);
}
