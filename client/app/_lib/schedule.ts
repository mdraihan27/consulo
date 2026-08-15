"use client";

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The viewer's own timezone — every instant from the API is rendered in it. */
export function getLocalTimeZone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}

export function minutesToLabel(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	const suffix = hours >= 12 ? "PM" : "AM";
	const displayHour = hours % 12 === 0 ? 12 : hours % 12;
	return `${displayHour}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function minutesToInputValue(minutes: number): string {
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function inputValueToMinutes(value: string): number {
	const [hours, mins] = value.split(":").map((part) => Number(part));
	if (!Number.isFinite(hours) || !Number.isFinite(mins)) return 0;
	return hours * 60 + mins;
}

export function formatSessionTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatSessionDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatSessionRange(startIso: string, endIso: string): string {
	return `${formatSessionDate(startIso)} · ${formatSessionTime(startIso)} – ${formatSessionTime(endIso)}`;
}

/** "in 3 days", "in 2 hours", "12 minutes ago" — coarse, and good enough for a card. */
export function formatRelative(iso: string): string {
	const diffMs = new Date(iso).getTime() - Date.now();
	const abs = Math.abs(diffMs);
	const minutes = Math.round(abs / 60000);

	if (minutes < 1) return "now";

	const format = (value: number, unit: string) => {
		const plural = value === 1 ? unit : `${unit}s`;
		return diffMs > 0 ? `in ${value} ${plural}` : `${value} ${plural} ago`;
	};

	if (minutes < 60) return format(minutes, "minute");
	const hours = Math.round(minutes / 60);
	if (hours < 24) return format(hours, "hour");
	const days = Math.round(hours / 24);
	if (days < 30) return format(days, "day");
	return format(Math.round(days / 30), "month");
}
