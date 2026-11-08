import { useContext } from "react";
import { DraftSessionRegistryContext } from "./DraftSessionRegistryContext";

export function useDraftSessionRegistry() {
	const registry = useContext(DraftSessionRegistryContext);

	if (registry === null) {
		throw new Error("useDraftSessionRegistry must be used within DraftSessionProvider");
	}

	return registry;
}
