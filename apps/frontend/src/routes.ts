import { index, layout, prefix, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("./pages/LandingPage/LandingPage.tsx"),
	route("login", "./pages/LoginPage/LoginPage.tsx"),
	route("register", "./pages/RegisterPage/RegisterPage.tsx"),

	layout("./layouts/AuthenticatedLayout/AuthenticatedLayout.tsx", [
		route("notebooks", "./pages/NotebooksPage/NotebooksPage.tsx"),

		...prefix("notebooks", [
			layout("./layouts/NotebookLayout/NotebookLayout.tsx", [
				route(":notebookId/edit/:nodeId?", "./pages/EditorPage/EditorPage.tsx"),
				route(":notebookId/view", "./pages/WorkspacePage/WorkspacePage.tsx"),
			]),
		]),
	]),
] satisfies RouteConfig;
