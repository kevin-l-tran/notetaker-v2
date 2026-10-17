import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import styles from "./DocumentRenderer.module.css";

import "katex/dist/katex.min.css";

type DocumentRendererProps = {
	source: string;
};

export default function DocumentRenderer({ source }: DocumentRendererProps) {
	return (
		<div className={styles.renderer}>
			<Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
				{source}
			</Markdown>
		</div>
	);
}
