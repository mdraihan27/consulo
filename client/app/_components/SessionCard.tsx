"use client";

import Link from "next/link";
import type { ConsultationSession } from "../_lib/api";
import {
	SESSION_STATUS_LABEL,
	formatRelative,
	formatSessionDate,
	formatSessionTime,
	isSessionJoinable,
	isSessionUpcoming
} from "../_lib/schedule";
import { Badge } from "./Badge";

type SessionCardProps = {
	session: ConsultationSession;
	viewerId: string;
	onReschedule?: (session: ConsultationSession) => void;
	onCancel?: (session: ConsultationSession) => void;
	onComplete?: (session: ConsultationSession) => void;
	onNoShow?: (session: ConsultationSession) => void;
	busy?: boolean;
};

const STATUS_TONE: Record<ConsultationSession["status"], "neutral" | "accent" | "accent-strong" | "muted"> = {
	pending: "neutral",
	scheduled: "accent",
	completed: "muted",
	cancelled: "muted",
	no_show: "muted"
};

export function SessionCard({
	session,
	viewerId,
	onReschedule,
	onCancel,
	onComplete,
	onNoShow,
	busy = false
}: SessionCardProps) {
	const isConsultant = session.consultantId === viewerId;
	const counterpart = isConsultant ? session.client : session.consultant;
	const counterpartName = `${counterpart.firstName} ${counterpart.lastName}`.trim();
	const initials = `${counterpart.firstName?.[0] || ""}${counterpart.lastName?.[0] || ""}`;

	const upcoming = isSessionUpcoming(session);
	const joinable = isSessionJoinable(session);
	const hasStarted = new Date(session.startAt).getTime() <= Date.now();
	const canClose = isConsultant && session.status === "scheduled" && hasStarted;

	return (
		<div className="rounded-2xl border border-border bg-base p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-soft">
						{counterpart.profilePicture ? (
							<img src={counterpart.profilePicture} alt={counterpartName} className="h-full w-full object-cover" />
						) : (
							<span className="text-sm font-bold text-text-muted">{initials}</span>
						)}
					</div>
					<div>
						<p className="text-sm font-semibold text-text-primary">{counterpartName}</p>
						<p className="text-xs text-text-muted">
							{isConsultant ? "Client" : counterpart.title || "Consultant"}
						</p>
					</div>
				</div>

				<Badge tone={STATUS_TONE[session.status]}>{SESSION_STATUS_LABEL[session.status]}</Badge>
			</div>

			<div className="mt-4 rounded-xl border border-border bg-bg-soft px-4 py-3">
				<p className="text-sm font-semibold text-text-primary">
					{formatSessionDate(session.startAt)} · {formatSessionTime(session.startAt)} – {formatSessionTime(session.endAt)}
				</p>
				<p className="mt-0.5 text-xs text-text-muted">
					{upcoming ? formatRelative(session.startAt) : formatRelative(session.endAt)} ·{" "}
					{session.mode === "online" ? "Online" : `In person — ${session.location}`}
				</p>
			</div>

			{session.agenda && <p className="mt-3 text-sm text-text-body">{session.agenda}</p>}

			{session.status === "cancelled" && session.cancellationReason && (
				<p className="mt-3 text-xs text-text-muted">Reason: {session.cancellationReason}</p>
			)}

			{session.status === "pending" && (
				<p className="mt-3 text-xs text-text-muted">
					Held for you until the consultant answers your request.
				</p>
			)}

			<div className="mt-4 flex flex-wrap items-center gap-2">
				{joinable && (
					<Link
						href={`/dashboard/chat/${session.bookingId}`}
						className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:opacity-90 transition"
					>
						Join session
					</Link>
				)}

				<Link
					href={`/dashboard/chat/${session.bookingId}`}
					className="rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-soft transition"
				>
					Open conversation
				</Link>

				{upcoming && onReschedule && (
					<button
						type="button"
						onClick={() => onReschedule(session)}
						disabled={busy}
						className="rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-soft disabled:opacity-50 transition cursor-pointer"
					>
						Reschedule
					</button>
				)}

				{upcoming && onCancel && (
					<button
						type="button"
						onClick={() => onCancel(session)}
						disabled={busy}
						className="rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold text-accent hover:bg-bg-soft disabled:opacity-50 transition cursor-pointer"
					>
						Cancel
					</button>
				)}

				{canClose && onComplete && (
					<button
						type="button"
						onClick={() => onComplete(session)}
						disabled={busy}
						className="rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-soft disabled:opacity-50 transition cursor-pointer"
					>
						Mark complete
					</button>
				)}

				{canClose && onNoShow && (
					<button
						type="button"
						onClick={() => onNoShow(session)}
						disabled={busy}
						className="rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold text-text-body hover:bg-bg-soft disabled:opacity-50 transition cursor-pointer"
					>
						No-show
					</button>
				)}
			</div>
		</div>
	);
}
