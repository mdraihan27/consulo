import { pool } from "../../config/db";
import { AdminInvite, AdminInviteStatus } from "./adminInvite.model";

export class AdminInviteRepository {
	private mapRowToInvite(row: any): AdminInvite {
		return new AdminInvite(
			row.id,
			row.email,
			row.invited_by,
			row.status as AdminInviteStatus,
			row.created_at,
			row.accepted_at
		);
	}

	async createInvite(id: string, email: string, invitedBy: string): Promise<AdminInvite> {
		const result = await pool.query({
			text: `INSERT INTO admin_invites (id, email, invited_by, status)
			       VALUES ($1, $2, $3, 'pending') RETURNING *`,
			values: [id, email, invitedBy]
		});
		return this.mapRowToInvite(result.rows[0]);
	}

	async getPendingInviteByEmail(email: string): Promise<AdminInvite | null> {
		const result = await pool.query({
			text: `SELECT * FROM admin_invites WHERE email=$1 AND status='pending' LIMIT 1`,
			values: [email]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToInvite(result.rows[0]);
	}

	async markAccepted(id: string): Promise<AdminInvite | null> {
		const result = await pool.query({
			text: `UPDATE admin_invites SET status='accepted', accepted_at=NOW() WHERE id=$1 RETURNING *`,
			values: [id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToInvite(result.rows[0]);
	}

	async revokeInvite(id: string, invitedBy: string): Promise<AdminInvite | null> {
		const result = await pool.query({
			text: `UPDATE admin_invites SET status='revoked'
			       WHERE id=$1 AND invited_by=$2 AND status='pending' RETURNING *`,
			values: [id, invitedBy]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToInvite(result.rows[0]);
	}

	async getAllInvites(): Promise<AdminInvite[]> {
		const result = await pool.query(`SELECT * FROM admin_invites ORDER BY created_at DESC`);
		return result.rows.map((row) => this.mapRowToInvite(row));
	}
}
