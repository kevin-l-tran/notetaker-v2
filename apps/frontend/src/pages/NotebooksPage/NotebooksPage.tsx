import AppHeader from "../../components/shared/Headers/AppHeader";

export default function NotebooksPage() {
	return (
		<div>
			<AppHeader />

			<main>
				<div className="tableHeader">
					<h1>Notebooks</h1>
					<button type="button">New Notebook</button>
				</div>

				<input placeholder="Search notebooks..." className="searchBar" />

				<div className="notebooks">
					<div>Notebook 1</div>
					<div>Notebook 2</div>
					<div>Notebook 3</div>
				</div>
			</main>
		</div>
	);
}
