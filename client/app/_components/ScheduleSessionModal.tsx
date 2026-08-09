"use client";

import { useState } from "react";
import { bookSession, rescheduleSession, type ConsultationSession, type SessionMode } from "../_lib/api";
import { SlotPicker } from "./SlotPicker";

type ScheduleSessionModalProps = {
	consultantId: string;
	/** Booking thread the new session belongs to. Omitted when rescheduling. */
	bookingId?: string;
	/** Present when moving an existing session instead of creating one. */
	session?: ConsultationSession;
	onClose: () => void;
	onDone: (session: ConsultationSession) => void;
};

export function ScheduleSessionModal({
	consultantId,
	bookingId,
	session,
	onClose,
	onDone
}: ScheduleSessionModalProps) {
	const isReschedule = Boolean(session);

	const [startAt, setStartAt] = useState<string | null>(null);
	const [mode, setMode] = useState<SessionMode>(session?.mode ?? "online");
	const [location, setLocation] = useState(session?.location ?? "");
	const [agenda, setAgenda] = useState(session?.agenda ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!startAt) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const result =
				isReschedule && session
					? await rescheduleSession(session.id, startAt)
					: await bookSession({ bookingId: bookingId!, startAt, mode, location, agenda });
			onDone(result);
		} catch (err: any) {
			setError(err?.message || "Could not schedule that session.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/60 px-4 py-8 backdrop-blur-sm">
			<div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-base p-7 shadow-xl">
				<h3 className="text-lg font-semibold text-text-primary">
					{isReschedule ? "Move this session" : "Schedule a session"}
				</h3>
				<p className="mt-1 text-sm text-text-body">
					{isReschedule
						? "Pick a new time from the consultant's open slots. Both of you will be notified."
						: "Pick one of the consultant's open times. Booking it confirms the session straight away."}
				</p>

				{error && <p className="mt-3 rounded-lg bg-bg-soft px-3 py-2 text-sm text-accent">{error}</p>}

				<form onSubmit={handleSubmit} className="mt-5 space-y-5">
					<SlotPicker
						consultantId={consultantId}
						value={startAt}
						onChange={setStartAt}
						excludeSessionId={session?.id}
					/>

					{!isReschedule && (
						<>
							<div>
								<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
									How will you meet?
								</span>
								<div className="flex gap-2">
									{(["online", "offline"] as SessionMode[]).map((option) => (
										<button
											key={option}
											type="button"
											onClick={() => setMode(option)}
											className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
												mode === option
													? "border-accent bg-accent/10 text-accent"
													: "border-border text-text-body hover:bg-bg-soft"
											}`}
										>
											{option === "online" ? "Online call" : "In person"}
										</button>
									))}
								</div>
							</div>

							{mode === "offline" && (
								<label className="block">
									<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
										Where
									</span>
									<input
										type="text"
										value={location}
										onChange={(e) => setLocation(e.target.value)}
										placeholder="Office address or meeting point"
										required
										className="w-full rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
									/>
								</label>
							)}

							<label className="block">
								<span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
									What do you want to cover? (optional)
								</span>
								<textarea
									value={agenda}
									onChange={(e) => setAgenda(e.target.value)}
									rows={3}
									placeholder="A short agenda helps the consultant prepare."
									className="w-full resize-none rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
								/>
							</label>
						</>
					)}

					<div className="flex items-center justify-end gap-3 pt-1">
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-soft disabled:opacity-50 transition cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || !startAt || (mode === "offline" && !location.trim() && !isReschedule)}
							className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition cursor-pointer"
						>
							{isSubmitting ? "Saving..." : isReschedule ? "Move session" : "Confirm session"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
