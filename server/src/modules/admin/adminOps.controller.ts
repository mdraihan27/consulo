import { Request, Response, NextFunction } from "express";
import { AdminOpsService } from "./adminOps.service";
import { ConsuloError } from "../../utils/errorHandler";

export class AdminOpsController {
	private adminOpsService = new AdminOpsService();

	async listUsers(req: Request, res: Response, next: NextFunction) {
		try {
			const users = await this.adminOpsService.listUsers();
			res.status(200).json({ success: true, message: "Users retrieved successfully", data: { users } });
		} catch (error) {
			next(error);
		}
	}

	async setUserSuspension(req: Request, res: Response, next: NextFunction) {
		try {
			const adminId = req.user?.id;
			if (!adminId) throw new ConsuloError(401, "Authorization token is required");

			const userId = String(req.params.userId || "");
			const { isSuspended } = req.body || {};
			const updated = await this.adminOpsService.setUserSuspension(adminId, userId, Boolean(isSuspended));
			res.status(200).json({ success: true, message: "User updated successfully", data: updated });
		} catch (error) {
			next(error);
		}
	}

	async getAnalytics(req: Request, res: Response, next: NextFunction) {
		try {
			const analytics = await this.adminOpsService.getAnalytics();
			res.status(200).json({ success: true, message: "Analytics retrieved successfully", data: analytics });
		} catch (error) {
			next(error);
		}
	}

	async getAuditLog(req: Request, res: Response, next: NextFunction) {
		try {
			const entries = await this.adminOpsService.getAuditLog();
			res.status(200).json({ success: true, message: "Audit log retrieved successfully", data: { entries } });
		} catch (error) {
			next(error);
		}
	}
}
