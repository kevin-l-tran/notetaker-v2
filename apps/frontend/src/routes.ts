import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("./pages/LandingPage/LandingPage.tsx"),
	route("login", "./pages/LoginPage/LoginPage.tsx"),

	layout("./layouts/AuthenticatedLayout/AuthenticatedLayout.tsx", [
		route("notebooks", "./pages/NotebooksPage/NotebooksPage.tsx"),
	]),
] satisfies RouteConfig;
