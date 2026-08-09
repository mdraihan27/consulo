import { v4 as uuidv4 } from "uuid";
import { SessionRepository } from "./session.repository";
import { AvailabilityService } from "./availability.service";
import { AvailabilityRepository } from "./availability.repository";
import { BookingRepository } from "../booking/booking.repository";
import { UserRepository } from "../user/user.repository";
import { NotificationService } from "../notification/notification.service";
import { ConsuloError } from "../../utils/errorHandler";
import { ConsultationSession, SessionMode } from "./scheduling.model";

const MAX_AGENDA_LENGTH = 1000;
const MAX_LOCATION_LENGTH = 300;

type BookSessionInput = {
	bookingId: string;
	startAt: string;
	mode?: SessionMode;
	location?: string;
	agenda?: string;
};

export class SessionService {
	private sessionRepository = new SessionRepository();
	private availabilityService = new AvailabilityService();
	private availabilityRepository = new AvailabilityRepository();
	private bookingRepository = new BookingRepository();
	private userRepository = new UserRepository();
	private notificationService = new NotificationService();

	private validateMeetingDetails(mode: any, location: any, agenda: any) {
		const resolvedMode: SessionMode = mode === "offline" ? "offline" : "online";
		const resolvedLocation = String(location || "").trim();
		const resolvedAgenda = String(agenda || "").trim();

		if (resolvedMode === "offline" && !resolvedLocation) {
			throw new ConsuloError(400, "In-person sessions need a location");
		}
		if (resolvedLocation.length > MAX_LOCATION_LENGTH) {
			throw new ConsuloError(400, `Location must be under ${MAX_LOCATION_LENGTH} characters`);
		}
		if (resolvedAgenda.length > MAX_AGENDA_LENGTH) {
			throw new ConsuloError(400, `Agenda must be under ${MAX_AGENDA_LENGTH} characters`);
		}

		return { mode: resolvedMode, location: resolvedLocation, agenda: resolvedAgenda };
	}

	/** Human-readable session time, rendered in the consultant's published timezone. */
	private async describeTime(session: ConsultationSession): Promise<string> {
		const settings = await this.availabilityRepository.getSettings(session.consultantId);
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

	private async notifyCounterpart(
		session: ConsultationSession,
		actorId: string,
		type: "session_booked" | "session_rescheduled" | "session_cancelled",
		title: string,
		bodyPrefix: string
	) {
		const recipientId = session.clientId === actorId ? session.consultantId : session.clientId;
		const actor = await this.userRepository.getUserById(actorId);
		const when = await this.describeTime(session);

		await this.notificationService.notify(
			recipientId,
			type,
			title,
			`${actor?.firstName || "The other party"} ${bodyPrefix} ${when}.`,
			`/dashboard/sessions`
		);
	}

	/**
	 * Book an open slot inside an accepted booking.
	 *
	 * The consultant published this time, so confirming it is a commitment — the
	 * session is scheduled immediately rather than waiting for another approval.
	 */
	async bookSession(clientId: string, input: BookSessionInput) {
		const booking = await this.bookingRepository.getBookingById(input.bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found");
		if (booking.clientId !== clientId) {
			throw new ConsuloError(403, "Only the client on this booking can schedule a session");
		}
		if (booking.status !== "accepted") {
			throw new ConsuloError(400, "Sessions can only be scheduled on an accepted booking");
		}

		const details = this.validateMeetingDetails(input.mode, input.location, input.agenda);
		const { startAt, endAt, settings } = await this.availabilityService.resolveSlot(
			booking.consultantId,
			input.startAt
		);

		const session = await this.sessionRepository.createSession(
			{
				id: uuidv4(),
				bookingId: booking.id,
				clientId: booking.clientId,
				consultantId: booking.consultantId,
				startAt,
				endAt,
				status: "scheduled",
				...details
			},
			settings.bufferMinutes
		);

		if (!session) {
			throw new ConsuloError(409, "That time was just taken. Pick another slot.");
		}

		await this.notifyCounterpart(session, clientId, "session_booked", "Session booked", "booked a session for");
		return session;
	}

	/**
	 * Attach a proposed time to a brand-new booking request. It stays `pending`
	 * (and holds the slot) until the consultant answers the request itself.
	 */
	async createPendingSessionForBooking(
		bookingId: string,
		clientId: string,
		consultantId: string,
		startAtIso: string,
		mode?: SessionMode,
		location?: string,
		agenda?: string
	) {
		const details = this.validateMeetingDetails(mode, location, agenda);
		const { startAt, endAt, settings } = await this.availabilityService.resolveSlot(consultantId, startAtIso);

		const session = await this.sessionRepository.createSession(
			{
				id: uuidv4(),
				bookingId,
				clientId,
				consultantId,
				startAt,
				endAt,
				status: "pending",
				...details
			},
			settings.bufferMinutes
		);

		if (!session) {
			throw new ConsuloError(409, "That time was just taken. Pick another slot.");
		}

		return session;
	}

	/** Booking accepted: the proposed times become real appointments. */
	async confirmPendingSessionsForBooking(bookingId: string) {
		return await this.sessionRepository.updateStatusForBooking(bookingId, "pending", "scheduled");
	}

	/** Booking declined: release the held slots. */
	async releasePendingSessionsForBooking(bookingId: string) {
		return await this.sessionRepository.updateStatusForBooking(bookingId, "pending", "cancelled");
	}

	async getMySessions(userId: string) {
		return await this.sessionRepository.getSessionsForUser(userId);
	}

	async getSessionsForBooking(bookingId: string, requesterId: string) {
		const booking = await this.bookingRepository.getBookingById(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found");
		if (booking.clientId !== requesterId && booking.consultantId !== requesterId) {
			throw new ConsuloError(403, "Forbidden");
		}
		return await this.sessionRepository.getSessionsForBooking(bookingId);
	}

	private async requireParticipantSession(sessionId: string, userId: string): Promise<ConsultationSession> {
		const session = await this.sessionRepository.getSessionById(sessionId);
		if (!session) throw new ConsuloError(404, "Session not found");
		if (session.clientId !== userId && session.consultantId !== userId) {
			throw new ConsuloError(403, "Forbidden");
		}
		return session;
	}

	async rescheduleSession(userId: string, sessionId: string, newStartAtIso: string) {
		const session = await this.requireParticipantSession(sessionId, userId);
		if (session.status !== "scheduled" && session.status !== "pending") {
			throw new ConsuloError(400, "Only an upcoming session can be moved");
		}
		if (session.startAt.getTime() < Date.now()) {
			throw new ConsuloError(400, "That session has already started");
		}

		const { startAt, endAt, settings } = await this.availabilityService.resolveSlot(
			session.consultantId,
			newStartAtIso,
			session.id
		);

		const moved = await this.sessionRepository.rescheduleSession(
			session.id,
			session.consultantId,
			startAt,
			endAt,
			settings.bufferMinutes
		);
		if (!moved) {
			throw new ConsuloError(409, "That time was just taken. Pick another slot.");
		}

		await this.notifyCounterpart(moved, userId, "session_rescheduled", "Session moved", "moved your session to");
		return moved;
	}

	async cancelSession(userId: string, sessionId: string, reason: string) {
		const session = await this.requireParticipantSession(sessionId, userId);
		if (session.status !== "scheduled" && session.status !== "pending") {
			throw new ConsuloError(400, "Only an upcoming session can be cancelled");
		}

		const cancelled = await this.sessionRepository.cancelSession(session.id, userId, (reason || "").trim());
		if (!cancelled) throw new ConsuloError(404, "Session not found");

		await this.notifyCounterpart(
			cancelled,
			userId,
			"session_cancelled",
			"Session cancelled",
			"cancelled the session scheduled for"
		);
		return cancelled;
	}

	async completeSession(consultantId: string, sessionId: string) {
		const session = await this.requireParticipantSession(sessionId, consultantId);
		if (session.consultantId !== consultantId) {
			throw new ConsuloError(403, "Only the consultant can close out a session");
		}
		if (session.status !== "scheduled") {
			throw new ConsuloError(400, "Only a scheduled session can be marked complete");
		}
		if (session.startAt.getTime() > Date.now()) {
			throw new ConsuloError(400, "That session has not started yet");
		}
		return await this.sessionRepository.updateStatus(session.id, "completed");
	}

	async markNoShow(consultantId: string, sessionId: string) {
		const session = await this.requireParticipantSession(sessionId, consultantId);
		if (session.consultantId !== consultantId) {
			throw new ConsuloError(403, "Only the consultant can mark a no-show");
		}
		if (session.status !== "scheduled") {
			throw new ConsuloError(400, "Only a scheduled session can be marked as a no-show");
		}
		if (session.startAt.getTime() > Date.now()) {
			throw new ConsuloError(400, "That session has not started yet");
		}
		return await this.sessionRepository.updateStatus(session.id, "no_show");
	}
}
