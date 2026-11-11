import { useCallback, useSyncExternalStore } from "react";
import type * as Y from "yjs";

export function useYTextValue(yText: Y.Text): string {
	const subscribe = useCallback(
		(onChange: () => void) => {
			yText.observe(onChange);
			return () => yText.unobserve(onChange);
		},
		[yText],
	);
	const getSnapshot = useCallback(() => yText.toString(), [yText]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
