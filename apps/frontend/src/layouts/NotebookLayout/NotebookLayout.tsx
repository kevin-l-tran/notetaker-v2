import { Outlet } from "react-router";
import NotebookHeader from "../../components/shared/Headers/NotebookHeader";

export default function NotebookLayout() {
	return (
		<div>
			<NotebookHeader />

			<Outlet />
		</div>
	);
}
