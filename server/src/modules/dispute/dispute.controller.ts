import { Request, Response, NextFunction } from "express";
import { DisputeService } from "./dispute.service";
import { ConsuloError } from "../../utils/errorHandler";

export class DisputeController {
	private disputeService = new DisputeService();

	async raiseDispute(req: Request, res: Response, next: NextFunction) {
		try {
			const consultantId = req.user?.id;
			if (!consultantId) throw new ConsuloError(401, "Authorization token is required");

			const { contractId, reason, evidenceUrl } = req.body || {};
			const dispute = await this.disputeService.raiseDispute(consultantId, contractId, reason, evidenceUrl);
			res.status(201).json({ success: true, message: "Dispute raised successfully", data: dispute });
		} catch (error) {
			next(error);
		}
	}

	async getDispute(req: Request, res: Response, next: NextFunction) {
		try {
			const requesterId = req.user?.id;
			if (!requesterId) throw new ConsuloError(401, "Authorization token is required");

			const disputeId = String(req.params.disputeId || "");
			const data = await this.disputeService.getDispute(requesterId, req.user?.role, disputeId);
			res.status(200).json({ success: true, message: "Dispute retrieved successfully", data });
		} catch (error) {
			next(error);
		}
	}

	async listAllDisputes(req: Request, res: Response, next: NextFunction) {
		try {
			const disputes = await this.disputeService.listAllDisputes();
			res.status(200).json({ success: true, message: "Disputes retrieved successfully", data: { disputes } });
		} catch (error) {
			next(error);
		}
	}

	async beginReview(req: Request, res: Response, next: NextFunction) {
		try {
			const adminId = req.user?.id;
			if (!adminId) throw new ConsuloError(401, "Authorization token is required");

			const disputeId = String(req.params.disputeId || "");
			const dispute = await this.disputeService.beginReview(adminId, disputeId);
			res.status(200).json({ success: true, message: "Dispute marked under review", data: dispute });
		} catch (error) {
			next(error);
		}
	}

	async resolveDispute(req: Request, res: Response, next: NextFunction) {
		try {
			const adminId = req.user?.id;
			if (!adminId) throw new ConsuloError(401, "Authorization token is required");

			const disputeId = String(req.params.disputeId || "");
			const { outcome, notes } = req.body || {};
			if (outcome !== "favor_client" && outcome !== "favor_consultant") {
				throw new ConsuloError(400, "outcome must be 'favor_client' or 'favor_consultant'");
			}

			const dispute = await this.disputeService.resolveDispute(adminId, disputeId, outcome, notes);
			res.status(200).json({ success: true, message: "Dispute resolved successfully", data: dispute });
		} catch (error) {
			next(error);
		}
	}
}
