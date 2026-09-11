import { Outlet } from "react-router";
import { requireAuthentication } from "../../middleware/auth";
import type { Route } from "./+types/AuthenticatedLayout";

export const clientMiddleware = [requireAuthentication] satisfies Route.ClientMiddlewareFunction[];

export default function AuthenticatedLayout() {
	return <Outlet />;
}
