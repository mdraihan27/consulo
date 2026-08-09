"use client";

import type { ConsultationSession, OpenSlot, SessionStatus } from "./api";

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

export type SlotDay = {
	key: string;
	label: string;
	slots: OpenSlot[];
};

/** Group open slots into the viewer's local calendar days, in order. */
export function groupSlotsByLocalDay(slots: OpenSlot[]): SlotDay[] {
	const days = new Map<string, SlotDay>();

	for (const slot of slots) {
		const date = new Date(slot.startAt);
		const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

		let day = days.get(key);
		if (!day) {
			day = {
				key,
				label: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
				slots: []
			};
			days.set(key, day);
		}
		day.slots.push(slot);
	}

	return Array.from(days.values());
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
	pending: "Awaiting confirmation",
	scheduled: "Scheduled",
	completed: "Completed",
	cancelled: "Cancelled",
	no_show: "No-show"
};

export function isSessionUpcoming(session: ConsultationSession): boolean {
	return (
		(session.status === "scheduled" || session.status === "pending") &&
		new Date(session.endAt).getTime() > Date.now()
	);
}

/** Online sessions open for joining ten minutes early and stay open until the end. */
export function isSessionJoinable(session: ConsultationSession): boolean {
	if (session.status !== "scheduled" || session.mode !== "online") return false;
	const now = Date.now();
	return now >= new Date(session.startAt).getTime() - 10 * 60 * 1000 && now <= new Date(session.endAt).getTime();
}
