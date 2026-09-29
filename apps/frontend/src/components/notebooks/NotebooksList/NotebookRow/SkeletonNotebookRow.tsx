import { motion } from "motion/react";
import styles from "./NotebookRow.module.css";

const shimmer = {
	backgroundPosition: ["-200% 0", "200% 0"],
};

const transition = {
	duration: 1.5,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

export default function SkeletonNotebookRow() {
	return (
		<div className={styles.rowLayout}>
			<motion.h2
				className={`${styles.skeletonLine} ${styles.rowLineTitle} ${styles.skeletonLineTitle}`}
				animate={shimmer}
				transition={transition}
			>
				Notebook
			</motion.h2>

			<motion.p
				className={`${styles.skeletonLine} ${styles.rowLineDescription} ${styles.skeletonLineDescription}`}
				animate={shimmer}
				transition={transition}
			>
				Description
			</motion.p>

			<motion.p
				className={`${styles.skeletonLine} ${styles.rowLineDate} ${styles.skeletonLineDate}`}
				animate={shimmer}
				transition={transition}
			>
				Updated
			</motion.p>
		</div>
	);
}
