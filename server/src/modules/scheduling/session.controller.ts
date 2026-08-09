import { NextFunction, Request, Response } from "express";
import { SessionService } from "./session.service";

const sessionService = new SessionService();

/** Rows joined with party details arrive snake_case; the API speaks camelCase. */
export function mapSessionRow(row: any) {
	return {
		id: row.id,
		bookingId: row.booking_id,
		clientId: row.client_id,
		consultantId: row.consultant_id,
		startAt: row.start_at,
		endAt: row.end_at,
		mode: row.mode,
		location: row.location,
		agenda: row.agenda,
		status: row.status,
		cancelledBy: row.cancelled_by,
		cancellationReason: row.cancellation_reason,
		cancelledAt: row.cancelled_at,
		rescheduledFromId: row.rescheduled_from_id,
		createdAt: row.created_at,
		bookingStatus: row.booking_status,
		client: {
			firstName: row.client_first_name,
			lastName: row.client_last_name,
			profilePicture: row.client_profile_picture
		},
		consultant: {
			firstName: row.consultant_first_name,
			lastName: row.consultant_last_name,
			profilePicture: row.consultant_profile_picture,
			title: row.consultant_title
		}
	};
}

export class SessionController {
	async bookSession(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const { bookingId, startAt, mode, location, agenda } = req.body ?? {};
			if (!bookingId || !startAt) {
				return res.status(400).json({ success: false, message: "bookingId and startAt are required." });
			}

			const session = await sessionService.bookSession(clientId, {
				bookingId: String(bookingId),
				startAt: String(startAt),
				mode,
				location,
				agenda
			});
			return res.status(201).json({ success: true, message: "Session booked.", data: session });
		} catch (err) {
			next(err);
		}
	}

	async getMySessions(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const rows = await sessionService.getMySessions(userId);
			return res.json({
				success: true,
				message: "Sessions retrieved.",
				data: { sessions: rows.map(mapSessionRow) }
			});
		} catch (err) {
			next(err);
		}
	}

	async getSessionsForBooking(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const rows = await sessionService.getSessionsForBooking(String(req.params.bookingId || ""), userId);
			return res.json({
				success: true,
				message: "Sessions retrieved.",
				data: { sessions: rows.map(mapSessionRow) }
			});
		} catch (err) {
			next(err);
		}
	}

	async rescheduleSession(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const { startAt } = req.body ?? {};
			if (!startAt) {
				return res.status(400).json({ success: false, message: "startAt is required." });
			}

			const session = await sessionService.rescheduleSession(
				userId,
				String(req.params.sessionId || ""),
				String(startAt)
			);
			return res.json({ success: true, message: "Session moved.", data: session });
		} catch (err) {
			next(err);
		}
	}

	async cancelSession(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const { reason } = req.body ?? {};
			const session = await sessionService.cancelSession(
				userId,
				String(req.params.sessionId || ""),
				String(reason || "")
			);
			return res.json({ success: true, message: "Session cancelled.", data: session });
		} catch (err) {
			next(err);
		}
	}

	async completeSession(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const session = await sessionService.completeSession(userId, String(req.params.sessionId || ""));
			return res.json({ success: true, message: "Session completed.", data: session });
		} catch (err) {
			next(err);
		}
	}

	async markNoShow(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const session = await sessionService.markNoShow(userId, String(req.params.sessionId || ""));
			return res.json({ success: true, message: "Session marked as a no-show.", data: session });
		} catch (err) {
			next(err);
		}
	}
}
