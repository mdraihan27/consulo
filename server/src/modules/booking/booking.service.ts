import { v4 as uuidv4 } from "uuid";
import { BookingRepository } from "./booking.repository";
import { UserRepository } from "../user/user.repository";
import { NotificationService } from "../notification/notification.service";
import { SessionService } from "../scheduling/session.service";
import { SessionMode } from "../scheduling/scheduling.model";
import { ConsuloError } from "../../utils/errorHandler";

const bookingRepo = new BookingRepository();
const userRepo = new UserRepository();
const notificationService = new NotificationService();
const sessionService = new SessionService();

export type ProposedSlot = {
	startAt: string;
	mode?: SessionMode;
	location?: string;
	agenda?: string;
};

export class BookingService {
	async requestBooking(clientId: string, consultantId: string, message: string, proposedSlot?: ProposedSlot) {
		if (clientId === consultantId) {
			throw new ConsuloError(400, "You cannot book yourself.");
		}
		const existing = await bookingRepo.getExistingPendingBooking(clientId, consultantId);
		if (existing) {
			throw new ConsuloError(409, "You already have a pending booking request with this consultant.");
		}
		const id = uuidv4();
		const booking = await bookingRepo.createBooking(id, clientId, consultantId, message);

		// A first-contact request can carry a proposed time. The slot is held as a
		// pending session and only becomes real when the consultant accepts.
		let session = null;
		if (proposedSlot?.startAt) {
			try {
				session = await sessionService.createPendingSessionForBooking(
					booking.id,
					clientId,
					consultantId,
					proposedSlot.startAt,
					proposedSlot.mode,
					proposedSlot.location,
					proposedSlot.agenda
				);
			} catch (error) {
				// Don't strand a booking whose slot was taken mid-request.
				await bookingRepo.deleteBooking(booking.id);
				throw error;
			}
		}

		const client = await userRepo.getUserById(clientId);
		await notificationService.notify(
			consultantId,
			"booking_request",
			"New consultation request",
			session
				? `${client?.firstName || "A client"} requested a consultation and proposed a time.`
				: `${client?.firstName || "A client"} requested a consultation with you.`,
			"/dashboard/bookings"
		);

		return { ...booking, session };
	}

	async respondToBooking(bookingId: string, consultantId: string, action: "accepted" | "declined") {
		const booking = await bookingRepo.getBookingById(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found.");
		if (booking.consultantId !== consultantId) throw new ConsuloError(403, "Forbidden.");
		if (booking.status !== "pending") throw new ConsuloError(400, "Booking is no longer pending.");
		const updated = await bookingRepo.updateBookingStatus(bookingId, action);

		// Any time proposed with the request rides on the answer: confirmed on
		// accept, and the held slot handed back on decline.
		const sessions =
			action === "accepted"
				? await sessionService.confirmPendingSessionsForBooking(bookingId)
				: await sessionService.releasePendingSessionsForBooking(bookingId);

		const consultant = await userRepo.getUserById(consultantId);
		await notificationService.notify(
			booking.clientId,
			"booking_response",
			`Booking ${action}`,
			sessions.length > 0 && action === "accepted"
				? `${consultant?.firstName || "The consultant"} accepted your request and confirmed your session.`
				: `${consultant?.firstName || "The consultant"} ${action} your consultation request.`,
			"/dashboard/bookings"
		);

		return updated;
	}

	async getMyConsultantBookings(consultantId: string) {
		return await bookingRepo.getBookingsForConsultant(consultantId);
	}

	async getMyClientBookings(clientId: string) {
		return await bookingRepo.getBookingsForClient(clientId);
	}

	async getChatHistory(bookingId: string, requesterId: string) {
		const booking = await bookingRepo.getBookingById(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found.");
		if (booking.clientId !== requesterId && booking.consultantId !== requesterId) {
			throw new ConsuloError(403, "Forbidden.");
		}
		const messages = await bookingRepo.getMessagesByBookingId(bookingId);
		return { booking, messages };
	}

	async getBookingById(bookingId: string, requesterId: string) {
		const booking = await bookingRepo.getBookingById(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found.");
		if (booking.clientId !== requesterId && booking.consultantId !== requesterId) {
			throw new ConsuloError(403, "Forbidden.");
		}
		return booking;
	}

	async getInbox(userId: string) {
		return await bookingRepo.getInboxForUser(userId);
	}

	async markRead(bookingId: string, requesterId: string) {
		const booking = await bookingRepo.getBookingById(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found.");
		if (booking.clientId !== requesterId && booking.consultantId !== requesterId) {
			throw new ConsuloError(403, "Forbidden.");
		}
		await bookingRepo.markRead(bookingId, requesterId);
	}
}
