import { pool } from "../../config/db";
import { Notification, NotificationType } from "./notification.model";

export class NotificationRepository {
	private mapRowToNotification(row: any): Notification {
		return new Notification(
			row.id,
			row.user_id,
			row.type as NotificationType,
			row.title,
			row.body,
			row.link,
			row.is_read,
			row.created_at
		);
	}

	async create(id: string, userId: string, type: NotificationType, title: string, body: string, link: string | null): Promise<Notification> {
		const result = await pool.query({
			text: `INSERT INTO notifications (id, user_id, type, title, body, link) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
			values: [id, userId, type, title, body, link]
		});
		return this.mapRowToNotification(result.rows[0]);
	}

	async getForUser(userId: string, limit: number = 50): Promise<Notification[]> {
		const result = await pool.query({
			text: `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
			values: [userId, limit]
		});
		return result.rows.map((row) => this.mapRowToNotification(row));
	}

	async getUnreadCount(userId: string): Promise<number> {
		const result = await pool.query({
			text: `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE`,
			values: [userId]
		});
		return parseInt(result.rows[0].count, 10);
	}

	async markRead(id: string, userId: string): Promise<Notification | null> {
		const result = await pool.query({
			text: `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *`,
			values: [id, userId]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToNotification(result.rows[0]);
	}

	async markAllRead(userId: string): Promise<void> {
		await pool.query({
			text: `UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE`,
			values: [userId]
		});
	}
}
