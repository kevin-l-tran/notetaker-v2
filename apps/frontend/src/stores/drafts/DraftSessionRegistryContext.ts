import { createContext } from "react";
import type { DraftSessionRegistry } from "./DraftSessionRegistry";

export const DraftSessionRegistryContext = createContext<DraftSessionRegistry | null>(null);
