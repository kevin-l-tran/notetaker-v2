import { indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import * as Y from "yjs";
import styles from "./DocumentEditor.module.css";

const theme = EditorView.theme({
	"&": {
		height: "100%",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--font-size-2)",
	},
	".cm-gutters": {
		backgroundColor: "var(--surface-1)",
		border: "0",
		color: "var(--text-muted)",
	},
});

type DocumentEditorProps = {
	yText: Y.Text;
};

export default function DocumentEditor({ yText }: DocumentEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const undoManager = new Y.UndoManager(yText);
		const view = new EditorView({
			parent: containerRef.current,
			doc: yText.toString(),
			extensions: [
				Prec.highest(keymap.of(yUndoManagerKeymap)),
				basicSetup,
				keymap.of([indentWithTab]),
				markdown(),
				EditorView.lineWrapping,
				theme,
				yCollab(yText, null, { undoManager }),
			],
		});

		return () => {
			view.destroy();
			undoManager.destroy();
		};
	}, [yText]);

	return <div ref={containerRef} className={styles.editor} />;
}
