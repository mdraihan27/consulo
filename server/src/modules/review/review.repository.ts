import { pool } from "../../config/db";
import { Review } from "./review.model";

export class ReviewRepository {
	private mapRowToReview(row: any): Review {
		return new Review(
			row.id,
			row.contract_id,
			row.reviewer_id,
			row.reviewee_id,
			row.rating,
			row.comment,
			row.reply,
			row.created_at,
			row.replied_at
		);
	}

	async createReview(id: string, contractId: string, reviewerId: string, revieweeId: string, rating: number, comment: string): Promise<Review> {
		const result = await pool.query({
			text: `INSERT INTO reviews (id, contract_id, reviewer_id, reviewee_id, rating, comment)
			       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
			values: [id, contractId, reviewerId, revieweeId, rating, comment]
		});
		return this.mapRowToReview(result.rows[0]);
	}

	async getReviewsByContractId(contractId: string): Promise<Review[]> {
		const result = await pool.query({
			text: "SELECT * FROM reviews WHERE contract_id=$1",
			values: [contractId]
		});
		return result.rows.map((row) => this.mapRowToReview(row));
	}

	async getReviewByContractAndReviewer(contractId: string, reviewerId: string): Promise<Review | null> {
		const result = await pool.query({
			text: "SELECT * FROM reviews WHERE contract_id=$1 AND reviewer_id=$2",
			values: [contractId, reviewerId]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToReview(result.rows[0]);
	}

	async addReply(id: string, revieweeId: string, reply: string): Promise<Review | null> {
		const result = await pool.query({
			text: `UPDATE reviews SET reply=$1, replied_at=NOW() WHERE id=$2 AND reviewee_id=$3 RETURNING *`,
			values: [reply, id, revieweeId]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToReview(result.rows[0]);
	}

	async getReviewsForUser(revieweeId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT r.*, u.first_name AS reviewer_first_name, u.last_name AS reviewer_last_name,
				u.username AS reviewer_username, u.profile_picture AS reviewer_profile_picture
			FROM reviews r
			JOIN users u ON u.id = r.reviewer_id
			WHERE r.reviewee_id=$1
			ORDER BY r.created_at DESC`,
			values: [revieweeId]
		});
		return result.rows;
	}

	async getAverageRatingForUser(revieweeId: string): Promise<{ average: number | null; count: number }> {
		const result = await pool.query({
			text: `SELECT AVG(rating)::float AS average, COUNT(*)::int AS count FROM reviews WHERE reviewee_id=$1`,
			values: [revieweeId]
		});
		const row = result.rows[0];
		return { average: row.average, count: row.count };
	}
}
