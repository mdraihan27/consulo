import { AdminOpsRepository } from "./adminOps.repository";
import { UserRepository } from "../user/user.repository";
import { AuditLogService } from "../audit/auditLog.service";
import { ConsuloError } from "../../utils/errorHandler";

export class AdminOpsService {
	private adminOpsRepository = new AdminOpsRepository();
	private userRepository = new UserRepository();
	private auditLogService = new AuditLogService();

	async listUsers() {
		return await this.adminOpsRepository.getUsersWithContractCounts();
	}

	async setUserSuspension(adminId: string, userId: string, isSuspended: boolean) {
		const target = await this.userRepository.getUserById(userId);
		if (!target) throw new ConsuloError(404, "User not found");
		if (target.role === "admin") throw new ConsuloError(403, "Admins cannot suspend other admins");

		const updated = await this.userRepository.setSuspended(userId, isSuspended);
		await this.auditLogService.record(
			adminId,
			isSuspended ? "suspend_user" : "unsuspend_user",
			"user",
			userId,
			target.email
		);
		return updated;
	}

	async getAnalytics() {
		return await this.adminOpsRepository.getPlatformAnalytics();
	}

	async getAuditLog() {
		return await this.auditLogService.getAll();
	}
}
