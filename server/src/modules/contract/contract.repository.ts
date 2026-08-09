import { pool } from "../../config/db";
import { Contract, ContractStatus, ContractTransaction, ContractTransactionType } from "./contract.model";

export class ContractRepository {
	private mapRowToContract(row: any): Contract {
		return new Contract(
			row.id,
			row.booking_id,
			row.client_id,
			row.consultant_id,
			row.title,
			Number(row.amount),
			Number(row.platform_fee_percent),
			row.status as ContractStatus,
			row.created_at,
			row.updated_at
		);
	}

	private mapRowToTransaction(row: any): ContractTransaction {
		return new ContractTransaction(
			row.id,
			row.contract_id,
			row.type as ContractTransactionType,
			Number(row.amount),
			row.created_at
		);
	}

	async createContract(
		id: string,
		bookingId: string,
		clientId: string,
		consultantId: string,
		title: string,
		amount: number,
		platformFeePercent: number
	): Promise<Contract> {
		const result = await pool.query({
			text: `INSERT INTO contracts (id, booking_id, client_id, consultant_id, title, amount, platform_fee_percent, status)
			       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment') RETURNING *`,
			values: [id, bookingId, clientId, consultantId, title, amount, platformFeePercent]
		});
		return this.mapRowToContract(result.rows[0]);
	}

	async getContractById(id: string): Promise<Contract | null> {
		const result = await pool.query({
			text: "SELECT * FROM contracts WHERE id=$1",
			values: [id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToContract(result.rows[0]);
	}

	async getContractByBookingId(bookingId: string): Promise<Contract | null> {
		const result = await pool.query({
			text: "SELECT * FROM contracts WHERE booking_id=$1",
			values: [bookingId]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToContract(result.rows[0]);
	}

	async updateContractStatus(id: string, status: ContractStatus): Promise<Contract | null> {
		const result = await pool.query({
			text: "UPDATE contracts SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
			values: [status, id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToContract(result.rows[0]);
	}

	async getContractsForClient(clientId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT c.*,
				u.first_name AS consultant_first_name,
				u.last_name AS consultant_last_name,
				u.username AS consultant_username,
				u.profile_picture AS consultant_profile_picture
			FROM contracts c
			JOIN users u ON u.id = c.consultant_id
			WHERE c.client_id=$1
			ORDER BY c.created_at DESC`,
			values: [clientId]
		});
		return result.rows;
	}

	async getContractsForConsultant(consultantId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT c.*,
				u.first_name AS client_first_name,
				u.last_name AS client_last_name,
				u.username AS client_username,
				u.profile_picture AS client_profile_picture
			FROM contracts c
			JOIN users u ON u.id = c.client_id
			WHERE c.consultant_id=$1
			ORDER BY c.created_at DESC`,
			values: [consultantId]
		});
		return result.rows;
	}

	async getContractsCountByUserId(userId: string, role: "freelancer" | "client"): Promise<number> {
		const column = role === "freelancer" ? "consultant_id" : "client_id";
		const result = await pool.query({
			text: `SELECT COUNT(*) FROM contracts WHERE ${column}=$1`,
			values: [userId]
		});
		return parseInt(result.rows[0].count, 10);
	}

	async createTransaction(id: string, contractId: string, type: ContractTransactionType, amount: number): Promise<ContractTransaction> {
		const result = await pool.query({
			text: `INSERT INTO contract_transactions (id, contract_id, type, amount) VALUES ($1, $2, $3, $4) RETURNING *`,
			values: [id, contractId, type, amount]
		});
		return this.mapRowToTransaction(result.rows[0]);
	}

	async getTransactionsForContract(contractId: string): Promise<ContractTransaction[]> {
		const result = await pool.query({
			text: `SELECT * FROM contract_transactions WHERE contract_id=$1 ORDER BY created_at ASC`,
			values: [contractId]
		});
		return result.rows.map((row) => this.mapRowToTransaction(row));
	}

	async getAllTransactions(): Promise<any[]> {
		const result = await pool.query(
			`SELECT ct.*, c.title AS contract_title, c.client_id, c.consultant_id
			FROM contract_transactions ct
			JOIN contracts c ON c.id = ct.contract_id
			ORDER BY ct.created_at DESC`
		);
		return result.rows;
	}
}
