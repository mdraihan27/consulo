import { Request, Response, NextFunction } from "express";
import { NotificationService } from "./notification.service";
import { ConsuloError } from "../../utils/errorHandler";

export class NotificationController {
	private notificationService = new NotificationService();

	async getForUser(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) throw new ConsuloError(401, "Authorization token is required");

			const data = await this.notificationService.getForUser(userId);
			res.status(200).json({ success: true, message: "Notifications retrieved successfully", data });
		} catch (error) {
			next(error);
		}
	}

	async markRead(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) throw new ConsuloError(401, "Authorization token is required");

			const notificationId = String(req.params.notificationId || "");
			const notification = await this.notificationService.markRead(userId, notificationId);
			res.status(200).json({ success: true, message: "Notification marked as read", data: notification });
		} catch (error) {
			next(error);
		}
	}

	async markAllRead(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) throw new ConsuloError(401, "Authorization token is required");

			await this.notificationService.markAllRead(userId);
			res.status(200).json({ success: true, message: "All notifications marked as read", data: { ok: true } });
		} catch (error) {
			next(error);
		}
	}
}
