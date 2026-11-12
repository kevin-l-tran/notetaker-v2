import { type ReactNode, useEffect, useState } from "react";
import { useDeleteDraft, useOpenDraft, useSaveDraft } from "../../data/api/mutations/nodes";
import { DraftSessionRegistry } from "./DraftSessionRegistry";
import { DraftSessionRegistryContext } from "./DraftSessionRegistryContext";
import { sessionFactory } from "./draftSessionFactory";

export function DraftSessionProvider({ children }: { children: ReactNode }) {
	const { mutateAsync: openDraft } = useOpenDraft();
	const { mutateAsync: saveDraft } = useSaveDraft();
	const { mutateAsync: deleteDraft } = useDeleteDraft();

	const [registry] = useState(
		() => new DraftSessionRegistry(sessionFactory(openDraft, saveDraft), deleteDraft),
	);

	useEffect(() => {
		return () => {
			void registry.closeAll().catch((error: unknown) => {
				console.error("Could not close all draft sessions", error);
			});
		};
	}, [registry]);

	return (
		<DraftSessionRegistryContext.Provider value={registry}>
			{children}
		</DraftSessionRegistryContext.Provider>
	);
}
