import { Request, Response, NextFunction } from "express";
import { BookingService } from "./booking.service";

const bookingService = new BookingService();

export class BookingController {
	async requestBooking(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized" });
			const { consultantId, message, startAt, mode, location, agenda } = req.body;
			if (!consultantId || !message?.trim()) {
				return res.status(400).json({ success: false, message: "consultantId and message are required." });
			}
			const booking = await bookingService.requestBooking(
				clientId,
				consultantId,
				message.trim(),
				startAt ? { startAt: String(startAt), mode, location, agenda } : undefined
			);
			return res.status(201).json({ success: true, message: "Booking request sent.", data: booking });
		} catch (err) {
			next(err);
		}
	}

	async respondToBooking(req: Request, res: Response, next: NextFunction) {
		try {
			const consultantId = req.user?.id;
			if (!consultantId) return res.status(401).json({ success: false, message: "Unauthorized" });
			const bookingId = String(req.params.bookingId || "");
			const { action } = req.body;
			if (!["accepted", "declined"].includes(action)) {
				return res.status(400).json({ success: false, message: "action must be 'accepted' or 'declined'." });
			}
			const booking = await bookingService.respondToBooking(bookingId, consultantId, action);
			return res.json({ success: true, message: `Booking ${action}.`, data: booking });
		} catch (err) {
			next(err);
		}
	}

	async getMyConsultantBookings(req: Request, res: Response, next: NextFunction) {
		try {
			const consultantId = req.user?.id;
			if (!consultantId) return res.status(401).json({ success: false, message: "Unauthorized" });
			const bookings = await bookingService.getMyConsultantBookings(consultantId);
			return res.json({ success: true, message: "Bookings retrieved.", data: { bookings } });
		} catch (err) {
			next(err);
		}
	}

	async getMyClientBookings(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized" });
			const bookings = await bookingService.getMyClientBookings(clientId);
			return res.json({ success: true, message: "Bookings retrieved.", data: { bookings } });
		} catch (err) {
			next(err);
		}
	}

	async getChatHistory(req: Request, res: Response, next: NextFunction) {
		try {
			const requesterId = req.user?.id;
			if (!requesterId) return res.status(401).json({ success: false, message: "Unauthorized" });
			const bookingId = String(req.params.bookingId || "");
			const data = await bookingService.getChatHistory(bookingId, requesterId);
			return res.json({ success: true, message: "Chat history retrieved.", data });
		} catch (err) {
			next(err);
		}
	}

	async getInbox(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
			const conversations = await bookingService.getInbox(userId);
			return res.json({ success: true, message: "Inbox retrieved.", data: { conversations } });
		} catch (err) {
			next(err);
		}
	}

	async markRead(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
			const bookingId = String(req.params.bookingId || "");
			await bookingService.markRead(bookingId, userId);
			return res.json({ success: true, message: "Marked as read.", data: { ok: true } });
		} catch (err) {
			next(err);
		}
	}
}
