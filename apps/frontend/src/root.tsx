import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { Outlet, Scripts, ScrollRestoration } from "react-router";
import queryClient from "./data/queryClient";
import "./index.css";
import "./tokens.css";

export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Notetaker</title>
			</head>

			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export function HydrateFallback() {
	return <div>Loading...</div>;
}

export default function Root() {
	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
