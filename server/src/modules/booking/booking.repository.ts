import { pool } from "../../config/db";
import { Booking, BookingStatus, ChatMessage } from "./booking.model";

export class BookingRepository {
	private mapRowToBooking(row: any): Booking {
		return new Booking(
			row.id,
			row.client_id,
			row.consultant_id,
			row.message,
			row.status as BookingStatus,
			row.created_at,
			row.updated_at
		);
	}

	async createBooking(id: string, clientId: string, consultantId: string, message: string): Promise<Booking> {
		const query = {
			text: `INSERT INTO bookings (id, client_id, consultant_id, message, status)
			       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
			values: [id, clientId, consultantId, message]
		};
		const result = await pool.query(query);
		return this.mapRowToBooking(result.rows[0]);
	}

	async getBookingById(id: string): Promise<Booking | null> {
		const result = await pool.query({
			text: "SELECT * FROM bookings WHERE id=$1",
			values: [id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToBooking(result.rows[0]);
	}

	async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | null> {
		const result = await pool.query({
			text: "UPDATE bookings SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
			values: [status, id]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToBooking(result.rows[0]);
	}

	async deleteBooking(id: string): Promise<void> {
		await pool.query({ text: "DELETE FROM bookings WHERE id=$1", values: [id] });
	}

	async getBookingsForConsultant(consultantId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT b.*, 
				u.first_name AS client_first_name, 
				u.last_name AS client_last_name, 
				u.username AS client_username,
				u.profile_picture AS client_profile_picture
			FROM bookings b
			JOIN users u ON u.id = b.client_id
			WHERE b.consultant_id=$1
			ORDER BY b.created_at DESC`,
			values: [consultantId]
		});
		return result.rows;
	}

	async getBookingsForClient(clientId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT b.*,
				u.first_name AS consultant_first_name,
				u.last_name AS consultant_last_name,
				u.username AS consultant_username,
				u.profile_picture AS consultant_profile_picture,
				fp.title AS consultant_title
			FROM bookings b
			JOIN users u ON u.id = b.consultant_id
			LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
			WHERE b.client_id=$1
			ORDER BY b.created_at DESC`,
			values: [clientId]
		});
		return result.rows;
	}

	// ---- Chat Messages ----

	private mapRowToChatMessage(row: any): ChatMessage {
		return new ChatMessage({
			id: row.id,
			bookingId: row.booking_id,
			senderId: row.sender_id,
			content: row.content,
			messageType: row.message_type,
			fileUrl: row.file_url,
			fileName: row.file_name,
			createdAt: row.created_at
		});
	}

	async addMessage(
		id: string,
		bookingId: string,
		senderId: string,
		content: string,
		messageType: "text" | "file" = "text",
		fileUrl: string | null = null,
		fileName: string | null = null
	): Promise<ChatMessage> {
		const result = await pool.query({
			text: `INSERT INTO chat_messages (id, booking_id, sender_id, content, message_type, file_url, file_name)
			       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
			values: [id, bookingId, senderId, content, messageType, fileUrl, fileName]
		});
		return this.mapRowToChatMessage(result.rows[0]);
	}

	async getMessagesByBookingId(bookingId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT cm.*, u.first_name, u.last_name, u.username, u.profile_picture
			FROM chat_messages cm
			JOIN users u ON u.id = cm.sender_id
			WHERE cm.booking_id=$1
			ORDER BY cm.created_at ASC`,
			values: [bookingId]
		});
		return result.rows;
	}

	async markRead(bookingId: string, userId: string): Promise<void> {
		await pool.query({
			text: `INSERT INTO booking_read_receipts (booking_id, user_id, last_read_at)
			       VALUES ($1, $2, NOW())
			       ON CONFLICT (booking_id, user_id) DO UPDATE SET last_read_at = NOW()`,
			values: [bookingId, userId]
		});
	}

	async getInboxForUser(userId: string): Promise<any[]> {
		const result = await pool.query({
			text: `SELECT
				b.id AS booking_id,
				b.status,
				b.client_id,
				b.consultant_id,
				CASE WHEN b.client_id = $1 THEN cu.first_name ELSE clu.first_name END AS other_first_name,
				CASE WHEN b.client_id = $1 THEN cu.last_name ELSE clu.last_name END AS other_last_name,
				CASE WHEN b.client_id = $1 THEN cu.username ELSE clu.username END AS other_username,
				CASE WHEN b.client_id = $1 THEN cu.profile_picture ELSE clu.profile_picture END AS other_profile_picture,
				lm.content AS last_message_content,
				lm.message_type AS last_message_type,
				lm.created_at AS last_message_at,
				lm.sender_id AS last_message_sender_id,
				COALESCE(rr.last_read_at, 'epoch') AS last_read_at,
				(SELECT COUNT(*) FROM chat_messages um WHERE um.booking_id = b.id AND um.created_at > COALESCE(rr.last_read_at, 'epoch') AND um.sender_id != $1)::int AS unread_count
			FROM bookings b
			JOIN users cu ON cu.id = b.consultant_id
			JOIN users clu ON clu.id = b.client_id
			LEFT JOIN LATERAL (
				SELECT content, message_type, created_at, sender_id
				FROM chat_messages
				WHERE booking_id = b.id
				ORDER BY created_at DESC
				LIMIT 1
			) lm ON true
			LEFT JOIN booking_read_receipts rr ON rr.booking_id = b.id AND rr.user_id = $1
			WHERE (b.client_id=$1 OR b.consultant_id=$1) AND b.status IN ('accepted', 'completed')
			ORDER BY COALESCE(lm.created_at, b.created_at) DESC`,
			values: [userId]
		});
		return result.rows;
	}

	async getExistingPendingBooking(clientId: string, consultantId: string): Promise<Booking | null> {
		const result = await pool.query({
			text: `SELECT * FROM bookings WHERE client_id=$1 AND consultant_id=$2 AND status='pending' LIMIT 1`,
			values: [clientId, consultantId]
		});
		if (!result.rows[0]) return null;
		return this.mapRowToBooking(result.rows[0]);
	}
}
