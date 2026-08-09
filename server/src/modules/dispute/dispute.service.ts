import { v4 as uuidv4 } from "uuid";
import { DisputeRepository } from "./dispute.repository";
import { ContractRepository } from "../contract/contract.repository";
import { UserRepository } from "../user/user.repository";
import { NotificationService } from "../notification/notification.service";
import { AuditLogService } from "../audit/auditLog.service";
import { ConsuloError } from "../../utils/errorHandler";
import { DisputeStatus } from "./dispute.model";

export class DisputeService {
	private disputeRepository = new DisputeRepository();
	private contractRepository = new ContractRepository();
	private userRepository = new UserRepository();
	private notificationService = new NotificationService();
	private auditLogService = new AuditLogService();

	async raiseDispute(consultantId: string, contractId: string, reason: string, evidenceUrl: string) {
		if (!reason || !reason.trim()) {
			throw new ConsuloError(400, "A reason for the dispute is required");
		}
		if (!evidenceUrl || !evidenceUrl.trim()) {
			throw new ConsuloError(400, "An evidence link is required");
		}

		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.consultantId !== consultantId) {
			throw new ConsuloError(403, "Only the consultant on this contract can raise a dispute");
		}
		if (contract.status !== "completion_requested") {
			throw new ConsuloError(400, "A dispute can only be raised while awaiting client confirmation");
		}

		const existing = await this.disputeRepository.getDisputeByContractId(contractId);
		if (existing) {
			throw new ConsuloError(409, "A dispute already exists for this contract");
		}

		const dispute = await this.disputeRepository.createDispute(uuidv4(), contractId, consultantId, reason.trim(), evidenceUrl.trim());
		await this.contractRepository.updateContractStatus(contractId, "disputed");

		const adminIds = await this.userRepository.getAllAdminIds();
		await Promise.all(
			adminIds.map((adminId) =>
				this.notificationService.notify(
					adminId,
					"dispute_raised",
					"New dispute needs review",
					`A dispute was raised for "${contract.title}" ($${contract.amount.toFixed(2)}).`,
					`/admin/disputes/${dispute.id}`
				)
			)
		);
		await this.notificationService.notify(
			contract.clientId,
			"dispute_raised",
			"Dispute raised on your contract",
			`The consultant raised a dispute for "${contract.title}". An admin will review the evidence.`,
			`/dashboard/contracts/${contract.id}`
		);

		return dispute;
	}

	async getDispute(requesterId: string, requesterRole: string | null | undefined, disputeId: string) {
		const dispute = await this.disputeRepository.getDisputeById(disputeId);
		if (!dispute) throw new ConsuloError(404, "Dispute not found");

		const contract = await this.contractRepository.getContractById(dispute.contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");

		const isParty = contract.clientId === requesterId || contract.consultantId === requesterId;
		if (!isParty && requesterRole !== "admin") {
			throw new ConsuloError(403, "Forbidden");
		}

		return { dispute, contract };
	}

	async listAllDisputes() {
		return await this.disputeRepository.getAllDisputes();
	}

	async beginReview(adminId: string, disputeId: string) {
		const dispute = await this.disputeRepository.getDisputeById(disputeId);
		if (!dispute) throw new ConsuloError(404, "Dispute not found");
		if (dispute.status !== "open") throw new ConsuloError(400, "This dispute is not open");
		const updated = await this.disputeRepository.markUnderReview(disputeId);
		await this.auditLogService.record(adminId, "begin_dispute_review", "dispute", disputeId);
		return updated;
	}

	async resolveDispute(adminId: string, disputeId: string, outcome: "favor_client" | "favor_consultant", notes: string) {
		if (!notes || !notes.trim()) {
			throw new ConsuloError(400, "Resolution notes are required");
		}

		const dispute = await this.disputeRepository.getDisputeById(disputeId);
		if (!dispute) throw new ConsuloError(404, "Dispute not found");
		if (dispute.status !== "open" && dispute.status !== "under_review") {
			throw new ConsuloError(400, "This dispute has already been resolved");
		}

		const contract = await this.contractRepository.getContractById(dispute.contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");

		const resolutionStatus: DisputeStatus = outcome === "favor_client" ? "resolved_favor_client" : "resolved_favor_consultant";

		if (outcome === "favor_consultant") {
			await this.contractRepository.createTransaction(uuidv4(), contract.id, "release", contract.consultantPayoutAmount);
			await this.contractRepository.createTransaction(uuidv4(), contract.id, "platform_fee", contract.platformFeeAmount);
			await this.contractRepository.updateContractStatus(contract.id, "completed");
		} else {
			await this.contractRepository.createTransaction(uuidv4(), contract.id, "refund", contract.amount);
			await this.contractRepository.updateContractStatus(contract.id, "cancelled");
		}

		const resolved = await this.disputeRepository.resolveDispute(disputeId, resolutionStatus, notes.trim(), adminId);
		await this.auditLogService.record(adminId, "resolve_dispute", "dispute", disputeId, `${outcome}: ${notes.trim()}`);

		const resolutionSummary = outcome === "favor_consultant"
			? "Funds have been released to the consultant."
			: "Funds have been refunded to the client.";
		await Promise.all([
			this.notificationService.notify(
				contract.clientId,
				"dispute_resolved",
				"Dispute resolved",
				`The dispute for "${contract.title}" has been resolved. ${resolutionSummary}`,
				`/dashboard/contracts/${contract.id}`
			),
			this.notificationService.notify(
				contract.consultantId,
				"dispute_resolved",
				"Dispute resolved",
				`The dispute for "${contract.title}" has been resolved. ${resolutionSummary}`,
				`/dashboard/contracts/${contract.id}`
			)
		]);

		return resolved;
	}
}
