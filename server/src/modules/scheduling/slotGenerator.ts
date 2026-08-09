import {
	addCalendarDays,
	getCalendarWeekday,
	getZonedDate,
	zonedWallTimeToUtc
} from "../../utils/timezone";
import { AvailabilityRule, BusyInterval, OpenSlot, SchedulingSettings, TimeOffBlock } from "./scheduling.model";

const MS_PER_MINUTE = 60 * 1000;

type GenerateSlotsInput = {
	settings: SchedulingSettings;
	rules: AvailabilityRule[];
	timeOff: TimeOffBlock[];
	busy: BusyInterval[];
	from: Date;
	to: Date;
	now?: Date;
};

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
	return aStart < bEnd && bStart < aEnd;
}

/**
 * Expand a consultant's weekly rules into concrete bookable slots.
 *
 * Slots are laid out from the start of each availability window in
 * `sessionDurationMinutes` steps separated by `bufferMinutes`, then filtered
 * against the booking horizon, minimum notice, time off, and existing sessions.
 * Existing sessions block their own span plus a buffer on each side.
 */
export function generateOpenSlots({
	settings,
	rules,
	timeOff,
	busy,
	from,
	to,
	now = new Date()
}: GenerateSlotsInput): OpenSlot[] {
	if (rules.length === 0) return [];

	const { timezone, sessionDurationMinutes, bufferMinutes, minNoticeHours, bookingHorizonDays } = settings;
	const durationMs = sessionDurationMinutes * MS_PER_MINUTE;
	const bufferMs = bufferMinutes * MS_PER_MINUTE;

	const earliestStart = Math.max(from.getTime(), now.getTime() + minNoticeHours * 60 * MS_PER_MINUTE);
	const latestEnd = Math.min(to.getTime(), now.getTime() + bookingHorizonDays * 24 * 60 * MS_PER_MINUTE);
	if (earliestStart >= latestEnd) return [];

	const rulesByWeekday = new Map<number, AvailabilityRule[]>();
	for (const rule of rules) {
		const bucket = rulesByWeekday.get(rule.weekday);
		if (bucket) bucket.push(rule);
		else rulesByWeekday.set(rule.weekday, [rule]);
	}

	const blocked: BusyInterval[] = [
		...timeOff.map((block) => ({ startAt: block.startAt, endAt: block.endAt })),
		...busy.map((interval) => ({
			startAt: new Date(interval.startAt.getTime() - bufferMs),
			endAt: new Date(interval.endAt.getTime() + bufferMs)
		}))
	];

	const slots: OpenSlot[] = [];

	// Step a day either side of the window so slots that straddle a local midnight
	// (from the viewer's perspective) are still considered.
	let cursor = addCalendarDays(getZonedDate(new Date(earliestStart), timezone), -1);
	const lastDate = addCalendarDays(getZonedDate(new Date(latestEnd), timezone), 1);
	const lastDateKey = lastDate.year * 10000 + lastDate.month * 100 + lastDate.day;

	while (cursor.year * 10000 + cursor.month * 100 + cursor.day <= lastDateKey) {
		const dayRules = rulesByWeekday.get(getCalendarWeekday(cursor));

		for (const rule of dayRules ?? []) {
			for (
				let startMinute = rule.startMinute;
				startMinute + sessionDurationMinutes <= rule.endMinute;
				startMinute += sessionDurationMinutes + bufferMinutes
			) {
				const slotStart = zonedWallTimeToUtc(cursor.year, cursor.month, cursor.day, startMinute, timezone).getTime();
				const slotEnd = slotStart + durationMs;

				if (slotStart < earliestStart || slotEnd > latestEnd) continue;

				const isBlocked = blocked.some((block) =>
					overlaps(slotStart, slotEnd, block.startAt.getTime(), block.endAt.getTime())
				);
				if (isBlocked) continue;

				slots.push({
					startAt: new Date(slotStart).toISOString(),
					endAt: new Date(slotEnd).toISOString()
				});
			}
		}

		cursor = addCalendarDays(cursor, 1);
	}

	slots.sort((a, b) => a.startAt.localeCompare(b.startAt));

	// A slot can be produced twice when a DST shift makes two local wall times map
	// to the same instant; keep one of each.
	return slots.filter((slot, index) => index === 0 || slot.startAt !== slots[index - 1].startAt);
}
