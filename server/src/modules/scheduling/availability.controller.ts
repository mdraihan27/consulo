import { NextFunction, Request, Response } from "express";
import { AvailabilityService } from "./availability.service";

const availabilityService = new AvailabilityService();

export class AvailabilityController {
	async getMyAvailability(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const data = await availabilityService.getMyAvailability(userId);
			return res.json({ success: true, message: "Availability retrieved.", data });
		} catch (err) {
			next(err);
		}
	}

	async updateMyAvailability(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const { settings, rules } = req.body ?? {};
			const data = await availabilityService.updateAvailability(userId, { settings, rules });
			return res.json({ success: true, message: "Availability updated.", data });
		} catch (err) {
			next(err);
		}
	}

	async addTimeOff(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			const { startAt, endAt, reason } = req.body ?? {};
			if (!startAt || !endAt) {
				return res.status(400).json({ success: false, message: "startAt and endAt are required." });
			}

			const data = await availabilityService.addTimeOff(userId, String(startAt), String(endAt), String(reason || ""));
			return res.status(201).json({ success: true, message: "Time off added.", data });
		} catch (err) {
			next(err);
		}
	}

	async removeTimeOff(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

			await availabilityService.removeTimeOff(userId, String(req.params.timeOffId || ""));
			return res.json({ success: true, message: "Time off removed.", data: { ok: true } });
		} catch (err) {
			next(err);
		}
	}

	async getConsultantSlots(req: Request, res: Response, next: NextFunction) {
		try {
			const consultantId = String(req.params.consultantId || "");
			const { from, to, excludeSessionId } = req.query as {
				from?: string;
				to?: string;
				excludeSessionId?: string;
			};

			const data = await availabilityService.getOpenSlots(
				consultantId,
				from,
				to,
				excludeSessionId,
				req.user?.id
			);
			return res.json({ success: true, message: "Open slots retrieved.", data });
		} catch (err) {
			next(err);
		}
	}
}
