"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
	cancelSession,
	completeSession,
	getMe,
	getMySessions,
	markSessionNoShow,
	type ConsultationSession,
	type PublicUser
} from "../../_lib/api";
import { isSessionUpcoming } from "../../_lib/schedule";
import { SessionCard } from "../../_components/SessionCard";
import { ScheduleSessionModal } from "../../_components/ScheduleSessionModal";
import { NotificationBell } from "../../_components/NotificationBell";
import { Spinner } from "../../_components/Spinner";

export default function SessionsPage() {
	const [me, setMe] = useState<PublicUser | null>(null);
	const [sessions, setSessions] = useState<ConsultationSession[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [reschedulingSession, setReschedulingSession] = useState<ConsultationSession | null>(null);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const [user, mySessions] = await Promise.all([getMe(), getMySessions()]);
				if (!isMounted) return;
				setMe(user);
				setSessions(mySessions);
			} catch (err: any) {
				if (isMounted) setError(err?.message || "Could not load your sessions.");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	const { upcoming, past } = useMemo(() => {
		const upcomingList = sessions
			.filter(isSessionUpcoming)
			.sort((a, b) => a.startAt.localeCompare(b.startAt));
		const pastList = sessions
			.filter((session) => !isSessionUpcoming(session))
			.sort((a, b) => b.startAt.localeCompare(a.startAt));
		return { upcoming: upcomingList, past: pastList };
	}, [sessions]);

	function replaceSession(updated: ConsultationSession) {
		setSessions((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
	}

	async function runAction(session: ConsultationSession, action: () => Promise<ConsultationSession>) {
		setBusyId(session.id);
		setError(null);
		try {
			replaceSession(await action());
		} catch (err: any) {
			setError(err?.message || "That didn't work.");
		} finally {
			setBusyId(null);
		}
	}

	async function handleCancel(session: ConsultationSession) {
		const reason = window.prompt("Let the other person know why you're cancelling:");
		if (reason === null) return;
		await runAction(session, () => cancelSession(session.id, reason));
	}

	if (isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-bg">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="flex min-h-dvh flex-col bg-bg">
			<header className="border-b border-border bg-base">
				<div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
					<div className="flex items-center gap-4">
						<Link href="/" className="inline-flex items-center">
							<img src="/assets/images/logo.svg" alt="Consulo" className="h-6 w-auto" />
						</Link>
						<span className="text-sm text-text-muted">Sessions</span>
					</div>
					<div className="flex items-center gap-3">
						<NotificationBell />
						<Link
							href="/dashboard"
							className="rounded-md border border-border-strong px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-soft"
						>
							← Back to Dashboard
						</Link>
					</div>
				</div>
			</header>

			<main className="flex-1">
				<div className="mx-auto w-full max-w-4xl px-6 py-10">
					<h1 className="text-2xl font-bold tracking-tight text-text-primary">Your sessions</h1>
					<p className="mt-1 text-sm text-text-body">
						All times are shown in your local timezone.
					</p>

					{error && (
						<p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
					)}

					<section className="mt-8">
						<h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
							Upcoming ({upcoming.length})
						</h2>

						{upcoming.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-border bg-base px-6 py-10 text-center">
								<p className="text-sm text-text-body">Nothing scheduled yet.</p>
								<Link
									href="/dashboard"
									className="mt-4 inline-flex items-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 transition"
								>
									Find a consultant
								</Link>
							</div>
						) : (
							<div className="space-y-4">
								{upcoming.map((session) => (
									<SessionCard
										key={session.id}
										session={session}
										viewerId={me?.id || ""}
										busy={busyId === session.id}
										onReschedule={setReschedulingSession}
										onCancel={handleCancel}
									/>
								))}
							</div>
						)}
					</section>

					{past.length > 0 && (
						<section className="mt-10">
							<h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
								Past ({past.length})
							</h2>
							<div className="space-y-4">
								{past.map((session) => (
									<SessionCard
										key={session.id}
										session={session}
										viewerId={me?.id || ""}
										busy={busyId === session.id}
										onComplete={(item) => runAction(item, () => completeSession(item.id))}
										onNoShow={(item) => runAction(item, () => markSessionNoShow(item.id))}
									/>
								))}
							</div>
						</section>
					)}
				</div>
			</main>

			{reschedulingSession && (
				<ScheduleSessionModal
					consultantId={reschedulingSession.consultantId}
					session={reschedulingSession}
					onClose={() => setReschedulingSession(null)}
					onDone={(updated) => {
						replaceSession(updated);
						setReschedulingSession(null);
					}}
				/>
			)}
		</div>
	);
}
