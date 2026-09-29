import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";

interface DocumentRendererProps {
	source: string;
}

export default function DocumentRenderer({ source }: DocumentRendererProps) {
	return (
		<div>
			<Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
				{source}
			</Markdown>
		</div>
	);
}
