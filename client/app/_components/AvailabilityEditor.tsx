"use client";

import { useEffect, useState } from "react";
import {
	addTimeOff,
	getMyAvailability,
	removeTimeOff,
	updateMyAvailability,
	type SchedulingSettings,
	type TimeOffBlock
} from "../_lib/api";
import {
	WEEKDAY_NAMES,
	formatSessionRange,
	getLocalTimeZone,
	inputValueToMinutes,
	minutesToInputValue
} from "../_lib/schedule";
import { Spinner } from "./Spinner";

type DraftWindow = { startMinute: number; endMinute: number };

const DEFAULT_WINDOW: DraftWindow = { startMinute: 9 * 60, endMinute: 17 * 60 };

const COMMON_TIMEZONES = [
	"UTC",
	"Asia/Dhaka",
	"Asia/Kolkata",
	"Asia/Dubai",
	"Asia/Singapore",
	"Asia/Tokyo",
	"Europe/London",
	"Europe/Berlin",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"Australia/Sydney"
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function AvailabilityEditor() {
	const [settings, setSettings] = useState<SchedulingSettings | null>(null);
	const [windowsByDay, setWindowsByDay] = useState<DraftWindow[][]>(() => WEEKDAY_NAMES.map(() => []));
	const [timeOff, setTimeOff] = useState<TimeOffBlock[]>([]);

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const [timeOffStart, setTimeOffStart] = useState("");
	const [timeOffEnd, setTimeOffEnd] = useState("");
	const [timeOffReason, setTimeOffReason] = useState("");
	const [isAddingTimeOff, setIsAddingTimeOff] = useState(false);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const data = await getMyAvailability();
				if (!isMounted) return;

				const grouped: DraftWindow[][] = WEEKDAY_NAMES.map(() => []);
				for (const rule of data.rules) {
					grouped[rule.weekday].push({ startMinute: rule.startMinute, endMinute: rule.endMinute });
				}

				setSettings(data.settings);
				setWindowsByDay(grouped);
				setTimeOff(data.timeOff);
			} catch (err: any) {
				if (isMounted) setError(err?.message || "Could not load your availability.");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	function updateWindow(weekday: number, index: number, patch: Partial<DraftWindow>) {
		setWindowsByDay((prev) =>
			prev.map((day, dayIndex) =>
				dayIndex === weekday ? day.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)) : day
			)
		);
	}

	function addWindow(weekday: number) {
		setWindowsByDay((prev) =>
			prev.map((day, dayIndex) => (dayIndex === weekday ? [...day, { ...DEFAULT_WINDOW }] : day))
		);
	}

	function removeWindow(weekday: number, index: number) {
		setWindowsByDay((prev) =>
			prev.map((day, dayIndex) => (dayIndex === weekday ? day.filter((_, i) => i !== index) : day))
		);
	}

	function copyMondayToWeekdays() {
		setWindowsByDay((prev) =>
			prev.map((day, dayIndex) =>
				dayIndex >= 1 && dayIndex <= 5 ? prev[1].map((slot) => ({ ...slot })) : day
			)
		);
	}

	async function handleSave() {
		if (!settings) return;
		setIsSaving(true);
		setError(null);
		setNotice(null);

		try {
			const rules = windowsByDay.flatMap((day, weekday) =>
				day.map((slot) => ({ weekday, startMinute: slot.startMinute, endMinute: slot.endMinute }))
			);
			const saved = await updateMyAvailability(settings, rules);
			setSettings(saved.settings);
			setNotice("Availability saved. Clients can book these times now.");
		} catch (err: any) {
			setError(err?.message || "Could not save your availability.");
		} finally {
			setIsSaving(false);
		}
	}

	async function handleAddTimeOff(e: React.FormEvent) {
		e.preventDefault();
		if (!timeOffStart || !timeOffEnd) return;

		setIsAddingTimeOff(true);
		setError(null);
		setNotice(null);

		try {
			const result = await addTimeOff(
				new Date(timeOffStart).toISOString(),
				new Date(timeOffEnd).toISOString(),
				timeOffReason
			);
			setTimeOff((prev) => [...prev, result.timeOff].sort((a, b) => a.startAt.localeCompare(b.startAt)));
			setTimeOffStart("");
			setTimeOffEnd("");
			setTimeOffReason("");
			setNotice(
				result.clashingSessionCount > 0
					? `Time off added. ${result.clashingSessionCount} already-booked session${
							result.clashingSessionCount === 1 ? "" : "s"
					  } fall in this window — reschedule or cancel them from your sessions page.`
					: "Time off added."
			);
		} catch (err: any) {
			setError(err?.message || "Could not add time off.");
		} finally {
			setIsAddingTimeOff(false);
		}
	}

	async function handleRemoveTimeOff(id: string) {
		try {
			await removeTimeOff(id);
			setTimeOff((prev) => prev.filter((block) => block.id !== id));
		} catch (err: any) {
			setError(err?.message || "Could not remove time off.");
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center rounded-2xl border border-border bg-base py-16">
				<Spinner />
			</div>
		);
	}

	if (!settings) {
		return (
			<div className="rounded-2xl border border-border bg-base p-6">
				<p className="text-sm text-text-body">{error || "Set your consulting field first to manage availability."}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{error && <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>}
			{notice && <p className="rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-body">{notice}</p>}

			<section className="rounded-2xl border border-border bg-base p-6">
				<h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Session settings</h3>
				<p className="mt-1 text-sm text-text-body">
					Your hours are published in your own timezone. Clients always see them converted to theirs
					{getLocalTimeZone() !== settings.timezone ? ` — yours right now looks like ${getLocalTimeZone()}.` : "."}
				</p>

				<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Timezone</span>
						<select
							value={settings.timezone}
							onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer"
						>
							{Array.from(new Set([settings.timezone, getLocalTimeZone(), ...COMMON_TIMEZONES])).map((zone) => (
								<option key={zone} value={zone}>
									{zone}
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Session length</span>
						<select
							value={settings.sessionDurationMinutes}
							onChange={(e) => setSettings({ ...settings, sessionDurationMinutes: Number(e.target.value) })}
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer"
						>
							{DURATION_OPTIONS.map((minutes) => (
								<option key={minutes} value={minutes}>
									{minutes} minutes
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Gap between sessions</span>
						<select
							value={settings.bufferMinutes}
							onChange={(e) => setSettings({ ...settings, bufferMinutes: Number(e.target.value) })}
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer"
						>
							{[0, 5, 10, 15, 30].map((minutes) => (
								<option key={minutes} value={minutes}>
									{minutes === 0 ? "No gap" : `${minutes} minutes`}
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Minimum notice</span>
						<input
							type="number"
							min={0}
							max={168}
							value={settings.minNoticeHours}
							onChange={(e) => setSettings({ ...settings, minNoticeHours: Number(e.target.value) })}
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
						<span className="mt-1 block text-xs text-text-muted">Hours of lead time before a slot can be booked</span>
					</label>

					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Booking window</span>
						<input
							type="number"
							min={1}
							max={180}
							value={settings.bookingHorizonDays}
							onChange={(e) => setSettings({ ...settings, bookingHorizonDays: Number(e.target.value) })}
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
						<span className="mt-1 block text-xs text-text-muted">How many days ahead clients can book</span>
					</label>
				</div>
			</section>

			<section className="rounded-2xl border border-border bg-base p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Weekly hours</h3>
						<p className="mt-1 text-sm text-text-body">Times are in {settings.timezone}.</p>
					</div>
					<button
						type="button"
						onClick={copyMondayToWeekdays}
						className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-soft transition cursor-pointer"
					>
						Copy Monday to weekdays
					</button>
				</div>

				<div className="mt-5 space-y-3">
					{WEEKDAY_NAMES.map((dayName, weekday) => (
						<div key={dayName} className="flex flex-col gap-3 rounded-xl border border-border bg-bg-soft p-4 sm:flex-row sm:items-start">
							<div className="w-28 flex-shrink-0 pt-2 text-sm font-semibold text-text-primary">{dayName}</div>

							<div className="flex-1 space-y-2">
								{windowsByDay[weekday].length === 0 && (
									<p className="pt-2 text-sm text-text-muted">Unavailable</p>
								)}

								{windowsByDay[weekday].map((slot, index) => (
									<div key={index} className="flex flex-wrap items-center gap-2">
										<input
											type="time"
											value={minutesToInputValue(slot.startMinute)}
											onChange={(e) => updateWindow(weekday, index, { startMinute: inputValueToMinutes(e.target.value) })}
											className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
										/>
										<span className="text-sm text-text-muted">to</span>
										<input
											type="time"
											value={minutesToInputValue(slot.endMinute)}
											onChange={(e) => updateWindow(weekday, index, { endMinute: inputValueToMinutes(e.target.value) })}
											className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
										/>
										<button
											type="button"
											onClick={() => removeWindow(weekday, index)}
											aria-label={`Remove ${dayName} window`}
											className="rounded-lg border border-border-strong px-2.5 py-2 text-xs font-semibold text-text-body hover:bg-base transition cursor-pointer"
										>
											Remove
										</button>
									</div>
								))}

								<button
									type="button"
									onClick={() => addWindow(weekday)}
									className="text-xs font-semibold text-accent hover:underline cursor-pointer"
								>
									+ Add hours
								</button>
							</div>
						</div>
					))}
				</div>

				<div className="mt-6 flex justify-end">
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving}
						className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
					>
						{isSaving ? "Saving..." : "Save availability"}
					</button>
				</div>
			</section>

			<section className="rounded-2xl border border-border bg-base p-6">
				<h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Time off</h3>
				<p className="mt-1 text-sm text-text-body">Block out holidays or busy stretches without touching your weekly hours.</p>

				<form onSubmit={handleAddTimeOff} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">From</span>
						<input
							type="datetime-local"
							value={timeOffStart}
							onChange={(e) => setTimeOffStart(e.target.value)}
							required
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
					</label>
					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Until</span>
						<input
							type="datetime-local"
							value={timeOffEnd}
							onChange={(e) => setTimeOffEnd(e.target.value)}
							required
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
					</label>
					<label className="block">
						<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Reason (optional)</span>
						<input
							type="text"
							value={timeOffReason}
							onChange={(e) => setTimeOffReason(e.target.value)}
							placeholder="Conference"
							className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
						/>
					</label>
					<div className="flex items-end">
						<button
							type="submit"
							disabled={isAddingTimeOff}
							className="w-full rounded-xl border border-border-strong px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-soft disabled:opacity-50 transition cursor-pointer"
						>
							{isAddingTimeOff ? "Adding..." : "Add time off"}
						</button>
					</div>
				</form>

				{timeOff.length > 0 && (
					<ul className="mt-5 space-y-2">
						{timeOff.map((block) => (
							<li
								key={block.id}
								className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-soft px-4 py-3"
							>
								<div>
									<p className="text-sm font-medium text-text-primary">{formatSessionRange(block.startAt, block.endAt)}</p>
									{block.reason && <p className="text-xs text-text-muted">{block.reason}</p>}
								</div>
								<button
									type="button"
									onClick={() => handleRemoveTimeOff(block.id)}
									className="text-xs font-semibold text-accent hover:underline cursor-pointer"
								>
									Remove
								</button>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
