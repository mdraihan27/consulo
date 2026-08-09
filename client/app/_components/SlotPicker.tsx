"use client";

import { useEffect, useMemo, useState } from "react";
import { getConsultantSlots, type OpenSlot } from "../_lib/api";
import { formatSessionTime, getLocalTimeZone, groupSlotsByLocalDay } from "../_lib/schedule";
import { Spinner } from "./Spinner";

type SlotPickerProps = {
	consultantId: string;
	value: string | null;
	onChange: (startAt: string | null) => void;
	/** Omit this session's own booking when picking a new time for it. */
	excludeSessionId?: string;
	emptyHint?: string;
};

export function SlotPicker({ consultantId, value, onChange, excludeSessionId, emptyHint }: SlotPickerProps) {
	const [slots, setSlots] = useState<OpenSlot[]>([]);
	const [durationMinutes, setDurationMinutes] = useState(60);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeDayKey, setActiveDayKey] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await getConsultantSlots(consultantId, undefined, undefined, excludeSessionId);
				if (!isMounted) return;
				setSlots(data.slots);
				setDurationMinutes(data.sessionDurationMinutes);
			} catch (err: any) {
				if (isMounted) setError(err?.message || "Could not load available times.");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [consultantId, excludeSessionId]);

	const days = useMemo(() => groupSlotsByLocalDay(slots), [slots]);
	const activeDay = days.find((day) => day.key === activeDayKey) ?? days[0] ?? null;

	useEffect(() => {
		if (!activeDayKey && days.length > 0) setActiveDayKey(days[0].key);
	}, [days, activeDayKey]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center rounded-xl border border-border bg-bg-soft py-10">
				<Spinner />
			</div>
		);
	}

	if (error) {
		return <p className="rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-accent">{error}</p>;
	}

	if (days.length === 0) {
		return (
			<p className="rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-body">
				{emptyHint || "This consultant has no open times right now. Send a message and agree on a time together."}
			</p>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-text-muted">
					{durationMinutes}-minute sessions · times shown in {getLocalTimeZone()}
				</p>
				{value && (
					<button
						type="button"
						onClick={() => onChange(null)}
						className="text-xs font-semibold text-accent hover:underline cursor-pointer"
					>
						Clear
					</button>
				)}
			</div>

			<div className="flex gap-2 overflow-x-auto pb-1">
				{days.map((day) => (
					<button
						key={day.key}
						type="button"
						onClick={() => setActiveDayKey(day.key)}
						className={`flex-shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
							activeDay?.key === day.key
								? "border-accent bg-accent/10 text-accent"
								: "border-border text-text-body hover:bg-bg-soft"
						}`}
					>
						{day.label}
					</button>
				))}
			</div>

			<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
				{(activeDay?.slots ?? []).map((slot) => {
					const isSelected = value === slot.startAt;
					return (
						<button
							key={slot.startAt}
							type="button"
							onClick={() => onChange(isSelected ? null : slot.startAt)}
							className={`rounded-lg border px-2 py-2 text-xs font-semibold transition cursor-pointer ${
								isSelected
									? "border-accent bg-accent text-on-accent"
									: "border-border text-text-primary hover:border-accent hover:bg-bg-soft"
							}`}
						>
							{formatSessionTime(slot.startAt)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
