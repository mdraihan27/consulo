import { Request, Response, NextFunction } from "express";
import { AdminInviteService } from "./adminInvite.service";
import { ConsuloError } from "../../utils/errorHandler";

export class AdminInviteController {
	private adminInviteService = new AdminInviteService();

	async inviteAdmin(req: Request, res: Response, next: NextFunction) {
		try {
			const invitedBy = req.user?.id;
			if (!invitedBy) throw new ConsuloError(401, "Authorization token is required");

			const email = String(req.body?.email || "");
			const invite = await this.adminInviteService.inviteAdmin(invitedBy, email);

			res.status(201).json({
				success: true,
				message: "Admin invite created successfully",
				data: invite
			});
		} catch (error) {
			next(error);
		}
	}

	async revokeInvite(req: Request, res: Response, next: NextFunction) {
		try {
			const invitedBy = req.user?.id;
			if (!invitedBy) throw new ConsuloError(401, "Authorization token is required");

			const inviteId = String(req.params.inviteId || "");
			const invite = await this.adminInviteService.revokeInvite(invitedBy, inviteId);

			res.status(200).json({
				success: true,
				message: "Admin invite revoked successfully",
				data: invite
			});
		} catch (error) {
			next(error);
		}
	}

	async listInvites(req: Request, res: Response, next: NextFunction) {
		try {
			const invites = await this.adminInviteService.listInvites();
			res.status(200).json({
				success: true,
				message: "Admin invites retrieved successfully",
				data: { invites }
			});
		} catch (error) {
			next(error);
		}
	}
}
