import { pool } from "../../config/db";

export class AdminOpsRepository {
	async getUsersWithContractCounts(): Promise<any[]> {
		const result = await pool.query(
			`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.role, u.is_suspended, u.profile_picture,
				(SELECT COUNT(*) FROM contracts c WHERE c.client_id = u.id OR c.consultant_id = u.id)::int AS contract_count
			FROM users u
			ORDER BY u.first_name ASC`
		);
		return result.rows;
	}

	async getPlatformAnalytics(): Promise<any> {
		const [gmv, feeRevenue, contractStats, disputeStats, userStats] = await Promise.all([
			pool.query(`SELECT COALESCE(SUM(amount), 0)::float AS total FROM contract_transactions WHERE type='payment'`),
			pool.query(`SELECT COALESCE(SUM(amount), 0)::float AS total FROM contract_transactions WHERE type='platform_fee'`),
			pool.query(
				`SELECT
					COUNT(*)::int AS total,
					COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
					COUNT(*) FILTER (WHERE status = 'disputed')::int AS disputed,
					COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
				FROM contracts`
			),
			pool.query(
				`SELECT
					COUNT(*)::int AS total,
					COUNT(*) FILTER (WHERE status IN ('open', 'under_review'))::int AS open
				FROM disputes`
			),
			pool.query(
				`SELECT
					COUNT(*)::int AS total,
					COUNT(*) FILTER (WHERE role = 'client')::int AS clients,
					COUNT(*) FILTER (WHERE role = 'freelancer')::int AS consultants,
					COUNT(*) FILTER (WHERE is_suspended = TRUE)::int AS suspended
				FROM users`
			)
		]);

		return {
			grossContractVolume: gmv.rows[0].total,
			platformFeeRevenue: feeRevenue.rows[0].total,
			contracts: contractStats.rows[0],
			disputes: disputeStats.rows[0],
			users: userStats.rows[0]
		};
	}
}
