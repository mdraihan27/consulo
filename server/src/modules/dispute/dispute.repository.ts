import { pool } from "../../config/db";
import { Dispute, DisputeStatus } from "./dispute.model";

export class DisputeRepository {
	private mapRowToDispute(row: any): Dispute {
		return new Dispute(
			row.id,
			row.contract_id,
			row.raised_by,
			row.reason,
			row.evidence_url,
			row.status as DisputeStatus,
			row.resolution_notes,
			row.resolved_by,
			row.created_at,
			row.resolved_at
		);
	}

	async createDispute(id: string, contractId: string, raisedBy: string, reason: string, evidenceUrl: string): Promise<Dispute> {
		const result = await pool.query({
			text: `INSERT INTO disputes (id, contract_id, raised_by, reason, evidence_url, status)
			       VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
			values: [id, contractId, raisedBy, reason, evidenceUrl]
		});
		return this.mapRowToDispute(result.rows[0]);
	}

	async getDisputeById(id: string): Promise<Dispute | null> {
		const result = await pool.query({
			text: "SELECT * FROM disputes WHERE id=$1",
			values: [id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToDispute(result.rows[0]);
	}

	async getDisputeByContractId(contractId: string): Promise<Dispute | null> {
		const result = await pool.query({
			text: "SELECT * FROM disputes WHERE contract_id=$1",
			values: [contractId]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToDispute(result.rows[0]);
	}

	async markUnderReview(id: string): Promise<Dispute | null> {
		const result = await pool.query({
			text: "UPDATE disputes SET status='under_review' WHERE id=$1 RETURNING *",
			values: [id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToDispute(result.rows[0]);
	}

	async resolveDispute(id: string, status: DisputeStatus, resolutionNotes: string, resolvedBy: string): Promise<Dispute | null> {
		const result = await pool.query({
			text: `UPDATE disputes SET status=$1, resolution_notes=$2, resolved_by=$3, resolved_at=NOW() WHERE id=$4 RETURNING *`,
			values: [status, resolutionNotes, resolvedBy, id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToDispute(result.rows[0]);
	}

	async getAllDisputes(): Promise<any[]> {
		const result = await pool.query(
			`SELECT d.*, c.title AS contract_title, c.amount AS contract_amount, c.client_id, c.consultant_id
			FROM disputes d
			JOIN contracts c ON c.id = d.contract_id
			ORDER BY d.created_at DESC`
		);
		return result.rows;
	}

	async getOpenDisputesCount(): Promise<number> {
		const result = await pool.query(`SELECT COUNT(*) FROM disputes WHERE status IN ('open', 'under_review')`);
		return parseInt(result.rows[0].count, 10);
	}
}
