import { Request, Response, NextFunction } from "express";
import { ContractService } from "./contract.service";
import { ConsuloError } from "../../utils/errorHandler";

export class ContractController {
	private contractService = new ContractService();

	async createContract(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) throw new ConsuloError(401, "Authorization token is required");

			const { bookingId, title, amount } = req.body || {};
			const contract = await this.contractService.createContract(clientId, bookingId, title, Number(amount));
			res.status(201).json({ success: true, message: "Contract created successfully", data: contract });
		} catch (error) {
			next(error);
		}
	}

	async payForContract(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) throw new ConsuloError(401, "Authorization token is required");

			const contractId = String(req.params.contractId || "");
			const contract = await this.contractService.payForContract(clientId, contractId);
			res.status(200).json({ success: true, message: "Payment successful, funds held in escrow", data: contract });
		} catch (error) {
			next(error);
		}
	}

	async acceptContract(req: Request, res: Response, next: NextFunction) {
		try {
			const consultantId = req.user?.id;
			if (!consultantId) throw new ConsuloError(401, "Authorization token is required");

			const contractId = String(req.params.contractId || "");
			const contract = await this.contractService.acceptContract(consultantId, contractId);
			res.status(200).json({ success: true, message: "Contract accepted, work can begin", data: contract });
		} catch (error) {
			next(error);
		}
	}

	async requestCompletion(req: Request, res: Response, next: NextFunction) {
		try {
			const consultantId = req.user?.id;
			if (!consultantId) throw new ConsuloError(401, "Authorization token is required");

			const contractId = String(req.params.contractId || "");
			const contract = await this.contractService.requestCompletion(consultantId, contractId);
			res.status(200).json({ success: true, message: "Completion requested", data: contract });
		} catch (error) {
			next(error);
		}
	}

	async confirmCompletion(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) throw new ConsuloError(401, "Authorization token is required");

			const contractId = String(req.params.contractId || "");
			const contract = await this.contractService.confirmCompletion(clientId, contractId);
			res.status(200).json({ success: true, message: "Contract completed, funds released to consultant", data: contract });
		} catch (error) {
			next(error);
		}
	}

	async cancelContract(req: Request, res: Response, next: NextFunction) {
		try {
			const requesterId = req.user?.id;
			if (!requesterId) throw new ConsuloError(401, "Authorization token is required");

			const contractId = String(req.params.contractId || "");
			const contract = await this.contractService.cancelContract(requesterId, contractId);
			res.status(200).json({ success: true, message: "Contract cancelled", data: contract });
		} catch (error) {
			next(error);
		}
	}

	async getContract(req: Request, res: Response, next: NextFunction) {
		try {
			const requesterId = req.user?.id;
			if (!requesterId) throw new ConsuloError(401, "Authorization token is required");

			const contractId = String(req.params.contractId || "");
			const data = await this.contractService.getContract(requesterId, contractId);
			res.status(200).json({ success: true, message: "Contract retrieved successfully", data });
		} catch (error) {
			next(error);
		}
	}

	async getMyClientContracts(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) throw new ConsuloError(401, "Authorization token is required");

			const contracts = await this.contractService.getMyClientContracts(clientId);
			res.status(200).json({ success: true, message: "Contracts retrieved successfully", data: { contracts } });
		} catch (error) {
			next(error);
		}
	}

	async getMyConsultantContracts(req: Request, res: Response, next: NextFunction) {
		try {
			const consultantId = req.user?.id;
			if (!consultantId) throw new ConsuloError(401, "Authorization token is required");

			const contracts = await this.contractService.getMyConsultantContracts(consultantId);
			res.status(200).json({ success: true, message: "Contracts retrieved successfully", data: { contracts } });
		} catch (error) {
			next(error);
		}
	}
}
