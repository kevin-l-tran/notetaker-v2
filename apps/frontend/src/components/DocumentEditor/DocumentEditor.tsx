import { indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

interface DocumentEditorProps {
	initialValue: string;
	onChange: (value: string) => void;
}

export default function DocumentEditor({ initialValue, onChange }: DocumentEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!containerRef.current) return;

		const view = new EditorView({
			parent: containerRef.current,
			doc: initialValue,
			extensions: [
				basicSetup,
				keymap.of([indentWithTab]),
				markdown(),
				EditorView.lineWrapping,

				EditorView.updateListener.of((update) => {
					if (!update.docChanged) return;

					onChangeRef.current(update.state.doc.toString());
				}),
			],
		});

		return () => {
			view.destroy();
		};
	}, [initialValue]);

	return <div ref={containerRef} />;
}
