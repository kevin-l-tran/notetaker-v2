import { Outlet } from "react-router";
import NotebookHeader from "../../components/shared/Headers/NotebookHeader";
import { DraftSessionProvider } from "../../stores/drafts/DraftSessionProvider";

export default function NotebookLayout() {
	return (
		<div>
			<NotebookHeader />

			<DraftSessionProvider>
				<Outlet />
			</DraftSessionProvider>
		</div>
	);
}
