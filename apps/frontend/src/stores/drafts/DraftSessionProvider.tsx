import { type ReactNode, useEffect, useState } from "react";
import { DraftSessionRegistry } from "./DraftSessionRegistry";
import { DraftSessionRegistryContext } from "./DraftSessionRegistryContext";
import { sessionFactory } from "./draftSessionFactory";

type DraftSessionProviderProps = {
	userId: string;
	children: ReactNode;
};

function RegistryScope({ children }: { children: ReactNode }) {
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

export function DraftSessionProvider({ userId, children }: DraftSessionProviderProps) {
	// Switching authenticated users mounts a fresh registry.
	// The previous scope attempts to flush and close its sessions.
	return <RegistryScope key={userId}>{children}</RegistryScope>;
}
