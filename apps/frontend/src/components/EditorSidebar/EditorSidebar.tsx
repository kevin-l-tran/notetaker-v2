import { Button, Input } from "@base-ui/react";
import styles from "./EditorSidebar.module.css";

/*
 *  Note: add semantic HTML later
 *  For now, CSS classes will serve as element descriptors
 */

export default function EditorSidebar() {
	return (
		<aside className={styles.sidebar}>
			<div className={styles.header}>
				<div className="title">Definitions</div>
				<div className="nodeCount">20</div>
			</div>

			<Input placeholder="Search concepts..." />

			<div className="nodeList">
				<div className="node">Item 1</div>
				<div className="node">Item 2</div>
				<div className="node">Item 3</div>
				<div className="node">Item 4</div>
				<div className="node">Item 5</div>
			</div>

			<Button>+ New Definition</Button>
		</aside>
	);
}
