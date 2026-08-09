import { v4 as uuidv4 } from "uuid";
import { AuditLogRepository } from "./auditLog.repository";

export class AuditLogService {
	private auditLogRepository = new AuditLogRepository();

	async record(adminId: string, action: string, targetType: string, targetId: string, details?: string) {
		return await this.auditLogRepository.record(uuidv4(), adminId, action, targetType, targetId, details ?? null);
	}

	async getAll() {
		return await this.auditLogRepository.getAll();
	}
}
