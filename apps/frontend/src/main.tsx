import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./index.css";
import "./tokens.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
