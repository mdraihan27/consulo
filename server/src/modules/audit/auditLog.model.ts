export class AuditLogEntry {
	id: string;
	adminId: string;
	action: string;
	targetType: string;
	targetId: string;
	details: string | null;
	createdAt: Date;

	constructor(
		id: string,
		adminId: string,
		action: string,
		targetType: string,
		targetId: string,
		details: string | null,
		createdAt: Date
	) {
		this.id = id;
		this.adminId = adminId;
		this.action = action;
		this.targetType = targetType;
		this.targetId = targetId;
		this.details = details;
		this.createdAt = createdAt;
	}
}
