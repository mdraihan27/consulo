import { SessionRepository } from "./session.repository";
import { AvailabilityRepository } from "./availability.repository";
import { NotificationService } from "../notification/notification.service";
import { ConsultationSession } from "./scheduling.model";

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const REMINDER_LEAD_MINUTES = 60;

const sessionRepository = new SessionRepository();
const availabilityRepository = new AvailabilityRepository();
const notificationService = new NotificationService();

async function describeTime(session: ConsultationSession): Promise<string> {
	const settings = await availabilityRepository.getSettings(session.consultantId);
	const timezone = settings?.timezone || "UTC";
	const formatted = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(session.startAt);
	return `${formatted} (${timezone})`;
}

async function sendReminders(): Promise<number> {
	const due = await sessionRepository.getSessionsNeedingReminder(REMINDER_LEAD_MINUTES);

	for (const session of due) {
		const when = await describeTime(session);
		const body =
			session.mode === "online"
				? `Your session starts soon — ${when}. Join from the conversation when it's time.`
				: `Your session starts soon — ${when} at ${session.location}.`;

		await Promise.all([
			notificationService.notify(session.clientId, "session_reminder", "Session starting soon", body, "/dashboard/sessions"),
			notificationService.notify(session.consultantId, "session_reminder", "Session starting soon", body, "/dashboard/sessions")
		]);

		await sessionRepository.markReminderSent(session.id);
	}

	return due.length;
}

/**
 * Periodic housekeeping for the calendar: remind both parties an hour out, close
 * out sessions whose time has passed, and release slots held by first-contact
 * requests the consultant never answered.
 */
export async function sweepSessions(): Promise<void> {
	try {
		const [reminded, completed, expired] = await Promise.all([
			sendReminders(),
			sessionRepository.completeElapsedSessions(),
			sessionRepository.expireStalePendingSessions()
		]);

		if (process.env.ENVIRONMENT === "dev" && (reminded || completed.length || expired.length)) {
			console.log(
				`[SessionSweeper] reminders=${reminded} completed=${completed.length} expired=${expired.length}`
			);
		}
	} catch (error) {
		console.error("[SessionSweeper] sweep failed:", error);
	}
}

export function startSessionSweeper(): NodeJS.Timeout {
	void sweepSessions();

	const timer = setInterval(() => {
		void sweepSessions();
	}, SWEEP_INTERVAL_MS);

	// Housekeeping should never hold the process open on shutdown.
	timer.unref();
	return timer;
}
