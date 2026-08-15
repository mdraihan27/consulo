import { pool } from "../../config/db";
import { User } from "./user.model";

class UserRepository{
    private mapRowToUser(row: any): User {
        return new User(
            row.id,
            row.first_name,
            row.last_name,
            row.email,
            row.username,
            row.role,
            row.is_verified,
            row.bio,
            row.profile_picture,
            row.password,
            row.is_suspended
        );
    }

    async createUser(user:User){
        const query = {
			text: "INSERT INTO users (id, first_name, last_name, email, username, password, role, is_verified, bio, profile_picture) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
			values: [
				user.id,
				user.firstName,
				user.lastName,
				user.email,
				user.username,
				user.password,
				user.role,
				user.isVerified,
				user.bio,
				user.profilePicture
			]
		};
		const result = await pool.query(query);
        return result;
    }

    async updateUser(user:User){
        const query = {
			text: "UPDATE users SET first_name=$1, last_name=$2, email=$3, username=$4, password=$5, role=$6, is_verified=$7, bio=$8, profile_picture=$9 WHERE id=$10",
			values: [
				user.firstName,
				user.lastName,
				user.email,
				user.username,
				user.password,
				user.role,
				user.isVerified,
				user.bio,
				user.profilePicture,
				user.id
			]
		};
		const result = await pool.query(query);
        return result;
    }

    async deleteUser(id:string){
        const query = {
			text: "DELETE FROM users WHERE id=$1",
			values: [id]
		};
		const result = await pool.query(query);
        return result;
    }

    async getUserById(id:string): Promise<User | null> {
        const query = {
			text: "SELECT * FROM users WHERE id=$1",
			values: [id]
		};
		const result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        return this.mapRowToUser(result.rows[0]);
    }

    async getUserByEmail(email:string): Promise<User | null> {
        const query = {
			text: "SELECT * FROM users WHERE email=$1",
			values: [email]
		};
		const result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        return this.mapRowToUser(result.rows[0]);
    }

    async getUserByUsername(username:string): Promise<User | null> {
        const query = {
			text: "SELECT * FROM users WHERE username=$1",
			values: [username]
		};
		const result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        return this.mapRowToUser(result.rows[0]);
    }

    async getAllUsers(): Promise<User[]> {
        const result = await pool.query("SELECT * FROM users");
        return result.rows.map((row) => this.mapRowToUser(row));
    }

    async getAllAdminIds(): Promise<string[]> {
        const result = await pool.query("SELECT id FROM users WHERE role='admin'");
        return result.rows.map((row) => row.id);
    }

    async setSuspended(userId: string, isSuspended: boolean): Promise<User | null> {
        const query = {
            text: "UPDATE users SET is_suspended=$1 WHERE id=$2 RETURNING *",
            values: [isSuspended, userId]
        };
        const result = await pool.query(query);
        if (!result.rows[0]) return null;
        return this.mapRowToUser(result.rows[0]);
    }

    async getFreelancerProfileByUserId(userId: string): Promise<{
        id: string;
        user_id: string;
        title: string;
        test_score: number | null;
        assessment_score: number | null;
        cert_score: number;
        rating_score: number;
    } | null> {
        const query = {
            text: `SELECT id, user_id, title, test_score,
                   COALESCE(assessment_score, CASE WHEN test_score IS NOT NULL THEN LEAST(50, test_score) ELSE NULL END) AS assessment_score,
                   COALESCE(cert_score, 0) AS cert_score,
                   COALESCE(rating_score, 0) AS rating_score
                   FROM freelancer_profiles WHERE user_id=$1`,
            values: [userId]
        };
        const result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        return {
            id: result.rows[0].id,
            user_id: result.rows[0].user_id,
            title: result.rows[0].title,
            test_score: result.rows[0].test_score !== null ? Number(result.rows[0].test_score) : null,
            assessment_score: result.rows[0].assessment_score !== null ? Number(result.rows[0].assessment_score) : null,
            cert_score: Number(result.rows[0].cert_score || 0),
            rating_score: Number(result.rows[0].rating_score || 0)
        };
    }

    async createFreelancerProfile(id: string, userId: string, title: string) {
        const query = {
            text: "INSERT INTO freelancer_profiles (id, user_id, title, cert_score, rating_score) VALUES ($1, $2, $3, 0, 0)",
            values: [id, userId, title]
        };
        return await pool.query(query);
    }

    async updateFreelancerProfileTitle(userId: string, title: string) {
        const query = {
            text: "UPDATE freelancer_profiles SET title=$1 WHERE user_id=$2",
            values: [title, userId]
        };
        return await pool.query(query);
    }

    async updateFreelancerProfileScore(userId: string, score: number | null) {
        const query = {
            text: "UPDATE freelancer_profiles SET test_score=$1 WHERE user_id=$2",
            values: [score, userId]
        };
        return await pool.query(query);
    }

    async updateFreelancerProfileScores(userId: string, scores: {
        testScore: number | null;
        assessmentScore?: number | null;
        certScore?: number;
        ratingScore?: number;
    }) {
        const query = {
            text: `UPDATE freelancer_profiles 
                   SET test_score = $1,
                       assessment_score = CASE WHEN $2::integer IS NOT NULL THEN $2::integer ELSE assessment_score END,
                       cert_score = CASE WHEN $3::integer IS NOT NULL THEN $3::integer ELSE cert_score END,
                       rating_score = CASE WHEN $4::integer IS NOT NULL THEN $4::integer ELSE rating_score END
                   WHERE user_id = $5`,
            values: [
                scores.testScore,
                scores.assessmentScore !== undefined ? scores.assessmentScore : null,
                scores.certScore !== undefined ? scores.certScore : null,
                scores.ratingScore !== undefined ? scores.ratingScore : null,
                userId
            ]
        };
        return await pool.query(query);
    }

    async resetFreelancerAssessmentScore(userId: string) {
        const query = {
            text: `UPDATE freelancer_profiles 
                   SET assessment_score = NULL,
                       test_score = NULL
                   WHERE user_id = $1`,
            values: [userId]
        };
        return await pool.query(query);
    }

    async searchFreelancers(options: {
        query?: string;
        minTestScore?: number;
        minRating?: number;
        sortBy?: "relevance" | "rating" | "test_score" | "newest";
    }): Promise<Array<{
        id: string; username: string; first_name: string; last_name: string; title: string;
        test_score: number | null; profile_picture: string; average_rating: number | null; review_count: number;
    }>> {
        const conditions: string[] = ["u.role = 'freelancer'"];
        const values: any[] = [];

        if (options.query?.trim()) {
            values.push(`%${options.query.trim()}%`);
            const paramIndex = values.length;
            conditions.push(`(
                u.first_name ILIKE $${paramIndex}
                OR u.last_name ILIKE $${paramIndex}
                OR u.username ILIKE $${paramIndex}
                OR fp.title ILIKE $${paramIndex}
            )`);
        }

        if (typeof options.minTestScore === "number") {
            values.push(options.minTestScore);
            conditions.push(`fp.test_score >= $${values.length}`);
        }

        const havingClauses: string[] = [];
        if (typeof options.minRating === "number") {
            values.push(options.minRating);
            havingClauses.push(`COALESCE(AVG(r.rating), 0) >= $${values.length}`);
        }

        const orderByMap: Record<string, string> = {
            relevance: "CASE WHEN fp.test_score IS NOT NULL THEN fp.test_score ELSE 0 END DESC, u.first_name ASC",
            rating: "average_rating DESC NULLS LAST, review_count DESC",
            test_score: "CASE WHEN fp.test_score IS NOT NULL THEN fp.test_score ELSE 0 END DESC",
            newest: "u.id DESC"
        };
        const orderBy = orderByMap[options.sortBy || "relevance"] || orderByMap.relevance;

        const sql = `
            SELECT u.id, u.username, u.first_name, u.last_name, fp.title, fp.test_score, u.profile_picture,
                AVG(r.rating)::float AS average_rating,
                COUNT(r.id)::int AS review_count
            FROM users u
            INNER JOIN freelancer_profiles fp ON fp.user_id = u.id
            LEFT JOIN reviews r ON r.reviewee_id = u.id
            WHERE ${conditions.join(" AND ")}
            GROUP BY u.id, fp.title, fp.test_score
            ${havingClauses.length > 0 ? `HAVING ${havingClauses.join(" AND ")}` : ""}
            ORDER BY ${orderBy}
            LIMIT 50
        `;
        const result = await pool.query(sql, values);
        return result.rows;
    }

    async addCertification(id: string, userId: string, name: string, url: string, score: number = 0): Promise<{ id: string; user_id: string; name: string; url: string; score: number }> {
        const query = {
            text: "INSERT INTO freelancer_certifications (id, user_id, name, url, score) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, name, url, COALESCE(score, 0) as score",
            values: [id, userId, name, url, score]
        };
        const result = await pool.query(query);
        return {
            id: result.rows[0].id,
            user_id: result.rows[0].user_id,
            name: result.rows[0].name,
            url: result.rows[0].url,
            score: Number(result.rows[0].score || 0)
        };
    }

    async getCertificationsByUserId(userId: string): Promise<Array<{ id: string; name: string; url: string; score: number }>> {
        const query = {
            text: "SELECT id, name, url, COALESCE(score, 0) as score FROM freelancer_certifications WHERE user_id=$1 ORDER BY created_at ASC",
            values: [userId]
        };
        const result = await pool.query(query);
        return (result.rows || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            url: row.url,
            score: Number(row.score || 0)
        }));
    }

    async updateCertificationScore(id: string, score: number) {
        const query = {
            text: "UPDATE freelancer_certifications SET score=$1 WHERE id=$2",
            values: [score, id]
        };
        return await pool.query(query);
    }

    async deleteCertification(id: string, userId: string): Promise<{ id: string } | null> {
        const query = {
            text: "DELETE FROM freelancer_certifications WHERE id=$1 AND user_id=$2 RETURNING id",
            values: [id, userId]
        };
        const result = await pool.query(query);
        return result.rows[0] || null;
    }
}

export {UserRepository};