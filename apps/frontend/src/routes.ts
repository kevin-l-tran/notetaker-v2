import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("./pages/EditorPage/EditorPage.tsx"),
	route("login", "./pages/LoginPage/LoginPage.tsx"),
] satisfies RouteConfig;
