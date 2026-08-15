import { v4 as uuidv4 } from "uuid";
import { BookingRepository } from "./booking.repository";
import { UserRepository } from "../user/user.repository";
import { NotificationService } from "../notification/notification.service";
import { ConsuloError } from "../../utils/errorHandler";

const bookingRepo = new BookingRepository();
const userRepo = new UserRepository();
const notificationService = new NotificationService();

export class BookingService {
	async requestBooking(clientId: string, consultantId: string, message: string) {
		if (clientId === consultantId) {
			throw new ConsuloError(400, "You cannot book yourself.");
		}
		const existing = await bookingRepo.getExistingPendingBooking(clientId, consultantId);
		if (existing) {
			throw new ConsuloError(409, "You already have a pending booking request with this consultant.");
		}
		const id = uuidv4();
		const booking = await bookingRepo.createBooking(id, clientId, consultantId, message);

		if (message && message.trim()) {
			await bookingRepo.addMessage(uuidv4(), booking.id, clientId, message.trim());
		}

		const client = await userRepo.getUserById(clientId);
		await notificationService.notify(
			consultantId,
			"booking_request",
			"New consultation request",
			`${client?.firstName || "A client"} requested a consultation with you.`,
			"/dashboard/bookings"
		);

		return booking;
	}

	async respondToBooking(bookingId: string, consultantId: string, action: "accepted" | "declined") {
		const booking = await bookingRepo.getBookingById(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found.");
		if (booking.consultantId !== consultantId) throw new ConsuloError(403, "Forbidden.");
		if (booking.status !== "pending") throw new ConsuloError(400, "Booking is no longer pending.");
		const updated = await bookingRepo.updateBookingStatus(bookingId, action);

		const consultant = await userRepo.getUserById(consultantId);
		await notificationService.notify(
			booking.clientId,
			"booking_response",
			`Booking ${action}`,
			`${consultant?.firstName || "The consultant"} ${action} your consultation request.`,
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
		const booking = await bookingRepo.getBookingByIdWithUsers(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found.");
		if (booking.client_id !== requesterId && booking.consultant_id !== requesterId) {
			throw new ConsuloError(403, "Forbidden.");
		}
		let messages = await bookingRepo.getMessagesByBookingId(bookingId);
		if (messages.length === 0 && booking.message && String(booking.message).trim()) {
			const initialMsg = await bookingRepo.addMessage(uuidv4(), bookingId, booking.client_id, String(booking.message).trim());
			const sender = await userRepo.getUserById(booking.client_id);
			messages = [{
				id: initialMsg.id,
				booking_id: initialMsg.bookingId,
				sender_id: initialMsg.senderId,
				content: initialMsg.content,
				message_type: initialMsg.messageType,
				file_url: initialMsg.fileUrl,
				file_name: initialMsg.fileName,
				created_at: initialMsg.createdAt,
				first_name: sender?.firstName,
				last_name: sender?.lastName,
				username: sender?.username,
				profile_picture: sender?.profilePicture
			}];
		}
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
