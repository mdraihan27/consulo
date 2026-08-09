import { pool } from "../../config/db";
import { AuditLogEntry } from "./auditLog.model";

export class AuditLogRepository {
	private mapRowToEntry(row: any): AuditLogEntry {
		return new AuditLogEntry(row.id, row.admin_id, row.action, row.target_type, row.target_id, row.details, row.created_at);
	}

	async record(id: string, adminId: string, action: string, targetType: string, targetId: string, details: string | null): Promise<AuditLogEntry> {
		const result = await pool.query({
			text: `INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
			       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
			values: [id, adminId, action, targetType, targetId, details]
		});
		return this.mapRowToEntry(result.rows[0]);
	}

	async getAll(limit: number = 200): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT al.*, u.first_name AS admin_first_name, u.last_name AS admin_last_name, u.username AS admin_username
			FROM admin_audit_log al
			JOIN users u ON u.id = al.admin_id
			ORDER BY al.created_at DESC
			LIMIT $1`,
			values: [limit]
		});
		return result.rows;
	}
}
