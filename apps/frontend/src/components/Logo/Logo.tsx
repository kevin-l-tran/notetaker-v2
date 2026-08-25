import { VectorSquare } from "lucide-react";
import styles from "./Logo.module.css";

export default function Logo({ showText = false }: { showText: boolean }) {
	return (
		<div className={styles.logoContainer}>
			<VectorSquare className={styles.logoIcon} />
			{showText && "Notetaker v2"}
		</div>
	);
}
