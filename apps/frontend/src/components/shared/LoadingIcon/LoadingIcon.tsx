import { HourglassIcon, LoaderCircleIcon } from "lucide-react";
import type { ComponentProps } from "react";
import styles from "./LoadingIcon.module.css";

type LoadingIconProps = Pick<
	ComponentProps<typeof LoaderCircleIcon>,
	"className" | "size" | "aria-hidden"
>;

export default function LoadingIcon({ className, size = 24 }: LoadingIconProps) {
	return (
		<span className={className} aria-hidden="true">
			<LoaderCircleIcon className={styles.spinner} size={size} />
			<HourglassIcon className={styles.staticIcon} size={size} />
		</span>
	);
}
