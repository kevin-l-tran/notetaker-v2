import { Menu } from "@base-ui/react";
import { EllipsisIcon } from "lucide-react";
import styles from "./NotebookOptions.module.css";

interface NotebookOptionsProps {
	onUpdateNotebook: () => void;
}

export default function NotebookOptions({ onUpdateNotebook }: NotebookOptionsProps) {
	return (
		<Menu.Root>
			<Menu.Trigger aria-label="Notebook options" className={styles.trigger}>
				<EllipsisIcon size={16} />
			</Menu.Trigger>

			<Menu.Portal>
				<Menu.Positioner className={styles.positioner} sideOffset={4}>
					<Menu.Popup className={styles.popup}>
						<Menu.Item className={styles.item} onClick={onUpdateNotebook}>
							Edit details
						</Menu.Item>

						<Menu.Separator className={styles.separator} />

						<Menu.Item className={`${styles.item} ${styles.delete}`} nativeButton>
							Delete notebook
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
