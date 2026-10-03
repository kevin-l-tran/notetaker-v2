export function formatRelativePastTime(time: string | Date): string {
	const date = new Date(time);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();

	const minutes = Math.floor(diffMs / (60 * 1000));
	const hours = Math.floor(diffMs / (60 * 60 * 1000));

	const relative = new Intl.RelativeTimeFormat(undefined, {
		numeric: "auto",
	});

	if (minutes < 1) return "just now";

	if (minutes < 60) return relative.format(-minutes, "minute");

	if (hours < 24) return relative.format(-hours, "hour");

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const updatedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const daysAgo = Math.round((today.getTime() - updatedDay.getTime()) / (24 * 60 * 60 * 1000));

	if (daysAgo === 1) return "yesterday";

	if (daysAgo < 7) return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);

	const sameYear = date.getFullYear() === now.getFullYear();

	const formattedDate = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		...(sameYear ? {} : { year: "numeric" }),
	}).format(date);

	return formattedDate;
}
