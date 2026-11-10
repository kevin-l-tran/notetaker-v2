import { type ReactNode, useEffect, useState } from "react";
import { DraftSessionRegistry } from "./DraftSessionRegistry";
import { DraftSessionRegistryContext } from "./DraftSessionRegistryContext";
import { sessionFactory } from "./draftSessionFactory";

export function DraftSessionProvider({ children }: { children: ReactNode }) {
	const [registry] = useState(() => new DraftSessionRegistry(sessionFactory));

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
