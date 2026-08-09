import { pool } from "../../config/db";
import { FavoriteConsultant } from "./favorite.model";

export class FavoriteRepository {
	private mapRowToFavorite(row: any): FavoriteConsultant {
		return new FavoriteConsultant(row.id, row.client_id, row.consultant_id, row.created_at);
	}

	async addFavorite(id: string, clientId: string, consultantId: string): Promise<FavoriteConsultant> {
		const result = await pool.query({
			text: `INSERT INTO favorite_consultants (id, client_id, consultant_id)
			       VALUES ($1, $2, $3)
			       ON CONFLICT (client_id, consultant_id) DO UPDATE SET client_id = EXCLUDED.client_id
			       RETURNING *`,
			values: [id, clientId, consultantId]
		});
		return this.mapRowToFavorite(result.rows[0]);
	}

	async removeFavorite(clientId: string, consultantId: string): Promise<boolean> {
		const result = await pool.query({
			text: `DELETE FROM favorite_consultants WHERE client_id=$1 AND consultant_id=$2`,
			values: [clientId, consultantId]
		});
		return (result.rowCount ?? 0) > 0;
	}

	async isFavorite(clientId: string, consultantId: string): Promise<boolean> {
		const result = await pool.query({
			text: `SELECT 1 FROM favorite_consultants WHERE client_id=$1 AND consultant_id=$2`,
			values: [clientId, consultantId]
		});
		return result.rows.length > 0;
	}

	async getFavoriteConsultantIds(clientId: string): Promise<string[]> {
		const result = await pool.query({
			text: `SELECT consultant_id FROM favorite_consultants WHERE client_id=$1`,
			values: [clientId]
		});
		return result.rows.map((row) => row.consultant_id);
	}

	async getFavoritesForClient(clientId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT f.id AS favorite_id, f.created_at AS favorited_at,
				u.id, u.username, u.first_name, u.last_name, u.profile_picture,
				fp.title, fp.test_score
			FROM favorite_consultants f
			JOIN users u ON u.id = f.consultant_id
			LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
			WHERE f.client_id=$1
			ORDER BY f.created_at DESC`,
			values: [clientId]
		});
		return result.rows;
	}
}
