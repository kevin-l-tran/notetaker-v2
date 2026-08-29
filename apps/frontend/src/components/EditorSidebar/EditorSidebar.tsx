import { Button, Input } from "@base-ui/react";
import styles from "./EditorSidebar.module.css";

export default function EditorSidebar() {
	return (
		<aside className={styles.sidebar}>
			<div className={styles.header}>
				<div>Definitions</div>
				<div>20</div>
			</div>

			<Input placeholder="Search concepts..." />

			<div>
				<div>Item 1</div>
				<div>Item 2</div>
				<div>Item 3</div>
				<div>Item 4</div>
				<div>Item 5</div>
      </div>

			<Button>+ New Definition</Button>
		</aside>
	);
}
