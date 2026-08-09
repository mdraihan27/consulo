/**
 * IANA timezone helpers built on Intl, so scheduling needs no date library.
 *
 * Everything stored in the database is a UTC instant. A consultant's published
 * hours are wall-clock times in their own zone, so converting between the two is
 * the only tricky part — and it has to survive DST transitions.
 */

const MS_PER_MINUTE = 60 * 1000;

export type ZonedParts = {
	year: number;
	month: number; // 1-12
	day: number; // 1-31
	weekday: number; // 0 = Sunday .. 6 = Saturday
	minutes: number; // minutes from local midnight
};

const WEEKDAY_INDEX: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
	const cached = formatterCache.get(timeZone);
	if (cached) return cached;

	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hour12: false,
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
	formatterCache.set(timeZone, formatter);
	return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
	if (!timeZone || typeof timeZone !== "string") return false;
	try {
		new Intl.DateTimeFormat("en-US", { timeZone });
		return true;
	} catch {
		return false;
	}
}

/** Break a UTC instant into the wall-clock parts an observer in `timeZone` would read. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
	const parts = getFormatter(timeZone).formatToParts(date);
	const lookup: Record<string, string> = {};
	for (const part of parts) {
		if (part.type !== "literal") lookup[part.type] = part.value;
	}

	// Intl renders midnight as hour 24 in some engines; normalise it to 0.
	const hour = Number(lookup.hour) % 24;

	return {
		year: Number(lookup.year),
		month: Number(lookup.month),
		day: Number(lookup.day),
		weekday: WEEKDAY_INDEX[lookup.weekday] ?? 0,
		minutes: hour * 60 + Number(lookup.minute)
	};
}

/** Offset of `timeZone` from UTC at a given instant, in milliseconds (east of UTC is positive). */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
	const parts = getZonedParts(date, timeZone);
	const seconds = Number(
		getFormatter(timeZone)
			.formatToParts(date)
			.find((p) => p.type === "second")?.value ?? "0"
	);

	const asUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		Math.floor(parts.minutes / 60),
		parts.minutes % 60,
		seconds
	);

	// Ignore sub-second drift; offsets are whole minutes.
	return asUtc - date.getTime() + date.getMilliseconds();
}

/**
 * Convert a wall-clock time in `timeZone` to the UTC instant it refers to.
 *
 * Two passes: guess using the offset that applies at the naive timestamp, then
 * re-check with the offset that actually applies at the resulting instant. That
 * second pass is what makes DST boundaries land correctly.
 */
export function zonedWallTimeToUtc(
	year: number,
	month: number,
	day: number,
	minutesFromMidnight: number,
	timeZone: string
): Date {
	const naive = Date.UTC(year, month - 1, day, 0, 0, 0) + minutesFromMidnight * MS_PER_MINUTE;

	const firstOffset = getTimeZoneOffsetMs(new Date(naive), timeZone);
	let instant = naive - firstOffset;

	const secondOffset = getTimeZoneOffsetMs(new Date(instant), timeZone);
	if (secondOffset !== firstOffset) {
		instant = naive - secondOffset;
	}

	return new Date(instant);
}

/** Local calendar date in `timeZone` for a UTC instant, as {year, month, day}. */
export function getZonedDate(date: Date, timeZone: string): { year: number; month: number; day: number } {
	const { year, month, day } = getZonedParts(date, timeZone);
	return { year, month, day };
}

/** Advance a calendar date by whole days without tripping over month lengths. */
export function addCalendarDays(
	date: { year: number; month: number; day: number },
	days: number
): { year: number; month: number; day: number } {
	const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day) + days * 24 * 60 * MS_PER_MINUTE);
	return {
		year: shifted.getUTCFullYear(),
		month: shifted.getUTCMonth() + 1,
		day: shifted.getUTCDate()
	};
}

/** Day of week (0 = Sunday) for a calendar date, independent of any timezone. */
export function getCalendarWeekday(date: { year: number; month: number; day: number }): number {
	return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

/** Render minutes-from-midnight as "HH:MM" for display and logging. */
export function formatMinutes(minutesFromMidnight: number): string {
	const hours = Math.floor(minutesFromMidnight / 60);
	const minutes = minutesFromMidnight % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
