import { PoolClient } from "pg";
import { pool } from "../../config/db";
import { BusyInterval, ConsultationSession, SessionMode, SessionStatus } from "./scheduling.model";

const SESSION_SELECT_WITH_PARTIES = `
	SELECT s.*,
		b.status AS booking_status,
		cl.first_name AS client_first_name,
		cl.last_name AS client_last_name,
		cl.profile_picture AS client_profile_picture,
		co.first_name AS consultant_first_name,
		co.last_name AS consultant_last_name,
		co.profile_picture AS consultant_profile_picture,
		fp.title AS consultant_title
	FROM consultation_sessions s
	JOIN bookings b ON b.id = s.booking_id
	JOIN users cl ON cl.id = s.client_id
	JOIN users co ON co.id = s.consultant_id
	LEFT JOIN freelancer_profiles fp ON fp.user_id = s.consultant_id
`;

export class SessionRepository {
	private mapRow(row: any): ConsultationSession {
		return new ConsultationSession({
			id: row.id,
			bookingId: row.booking_id,
			clientId: row.client_id,
			consultantId: row.consultant_id,
			startAt: row.start_at,
			endAt: row.end_at,
			mode: row.mode as SessionMode,
			location: row.location,
			agenda: row.agenda,
			status: row.status as SessionStatus,
			cancelledBy: row.cancelled_by,
			cancellationReason: row.cancellation_reason,
			cancelledAt: row.cancelled_at,
			rescheduledFromId: row.rescheduled_from_id,
			reminderSentAt: row.reminder_sent_at,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		});
	}

	/**
	 * Serialise every write that claims a time on a consultant's calendar.
	 *
	 * The advisory lock is held for the life of the transaction and keyed on the
	 * consultant, so two clients racing for the same slot queue up instead of both
	 * passing the overlap check. Works without any Postgres extension.
	 */
	private async withConsultantLock<T>(consultantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query({ text: "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", values: [consultantId] });
			const result = await fn(client);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	private async hasOverlap(
		client: PoolClient,
		consultantId: string,
		startAt: Date,
		endAt: Date,
		bufferMinutes: number,
		excludeSessionId?: string
	): Promise<boolean> {
		const result = await client.query({
			text: `SELECT 1 FROM consultation_sessions
			       WHERE consultant_id = $1
			         AND status IN ('pending', 'scheduled')
			         AND ($4::text IS NULL OR id <> $4)
			         AND start_at - make_interval(mins => $5::int) < $3
			         AND end_at + make_interval(mins => $5::int) > $2
			       LIMIT 1`,
			values: [consultantId, startAt, endAt, excludeSessionId ?? null, bufferMinutes]
		});
		return (result.rowCount ?? 0) > 0;
	}

	async createSession(
		input: {
			id: string;
			bookingId: string;
			clientId: string;
			consultantId: string;
			startAt: Date;
			endAt: Date;
			mode: SessionMode;
			location: string;
			agenda: string;
			status: SessionStatus;
			rescheduledFromId?: string | null;
		},
		bufferMinutes: number
	): Promise<ConsultationSession | null> {
		return await this.withConsultantLock(input.consultantId, async (client) => {
			const taken = await this.hasOverlap(
				client,
				input.consultantId,
				input.startAt,
				input.endAt,
				bufferMinutes
			);
			if (taken) return null;

			const result = await client.query({
				text: `INSERT INTO consultation_sessions
				       (id, booking_id, client_id, consultant_id, start_at, end_at, mode, location, agenda, status, rescheduled_from_id)
				       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
				values: [
					input.id,
					input.bookingId,
					input.clientId,
					input.consultantId,
					input.startAt,
					input.endAt,
					input.mode,
					input.location,
					input.agenda,
					input.status,
					input.rescheduledFromId ?? null
				]
			});
			return this.mapRow(result.rows[0]);
		});
	}

	/** Move a session to a new time, re-checking the calendar under the same lock. */
	async rescheduleSession(
		sessionId: string,
		consultantId: string,
		startAt: Date,
		endAt: Date,
		bufferMinutes: number
	): Promise<ConsultationSession | null> {
		return await this.withConsultantLock(consultantId, async (client) => {
			const taken = await this.hasOverlap(client, consultantId, startAt, endAt, bufferMinutes, sessionId);
			if (taken) return null;

			const result = await client.query({
				text: `UPDATE consultation_sessions
				       SET start_at=$1, end_at=$2, reminder_sent_at=NULL, updated_at=NOW()
				       WHERE id=$3 RETURNING *`,
				values: [startAt, endAt, sessionId]
			});
			if (!result.rows[0]) return null;
			return this.mapRow(result.rows[0]);
		});
	}

	async getSessionById(id: string): Promise<ConsultationSession | null> {
		const result = await pool.query({ text: "SELECT * FROM consultation_sessions WHERE id=$1", values: [id] });
		if (!result.rows[0]) return null;
		return this.mapRow(result.rows[0]);
	}

	async getSessionWithParties(id: string): Promise<any | null> {
		const result = await pool.query({ text: `${SESSION_SELECT_WITH_PARTIES} WHERE s.id=$1`, values: [id] });
		return result.rows[0] ?? null;
	}

	async getSessionsForUser(userId: string): Promise<any[]> {
		const result = await pool.query({
			text: `${SESSION_SELECT_WITH_PARTIES}
			       WHERE s.client_id=$1 OR s.consultant_id=$1
			       ORDER BY s.start_at DESC`,
			values: [userId]
		});
		return result.rows;
	}

	async getSessionsForBooking(bookingId: string): Promise<any[]> {
		const result = await pool.query({
			text: `${SESSION_SELECT_WITH_PARTIES} WHERE s.booking_id=$1 ORDER BY s.start_at ASC`,
			values: [bookingId]
		});
		return result.rows;
	}

	/**
	 * Active sessions on a consultant's calendar, used to punch holes in open slots.
	 * `excludeSessionId` lets a reschedule ignore the booking it is moving.
	 */
	async getBusyIntervals(
		consultantId: string,
		from: Date,
		to: Date,
		excludeSessionId?: string
	): Promise<BusyInterval[]> {
		const result = await pool.query({
			text: `SELECT start_at, end_at FROM consultation_sessions
			       WHERE consultant_id=$1
			         AND status IN ('pending', 'scheduled')
			         AND start_at < $3 AND end_at > $2
			         AND ($4::text IS NULL OR id <> $4)`,
			values: [consultantId, from, to, excludeSessionId ?? null]
		});
		return result.rows.map((row) => ({ startAt: row.start_at, endAt: row.end_at }));
	}

	async updateStatus(id: string, status: SessionStatus): Promise<ConsultationSession | null> {
		const result = await pool.query({
			text: "UPDATE consultation_sessions SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
			values: [status, id]
		});
		if (!result.rows[0]) return null;
		return this.mapRow(result.rows[0]);
	}

	async cancelSession(id: string, cancelledBy: string, reason: string): Promise<ConsultationSession | null> {
		const result = await pool.query({
			text: `UPDATE consultation_sessions
			       SET status='cancelled', cancelled_by=$1, cancellation_reason=$2, cancelled_at=NOW(), updated_at=NOW()
			       WHERE id=$3 RETURNING *`,
			values: [cancelledBy, reason, id]
		});
		if (!result.rows[0]) return null;
		return this.mapRow(result.rows[0]);
	}

	/** Promote or drop the sessions that were riding along with a first-contact booking. */
	async updateStatusForBooking(
		bookingId: string,
		fromStatus: SessionStatus,
		toStatus: SessionStatus
	): Promise<ConsultationSession[]> {
		const result = await pool.query({
			text: `UPDATE consultation_sessions SET status=$1, updated_at=NOW()
			       WHERE booking_id=$2 AND status=$3 RETURNING *`,
			values: [toStatus, bookingId, fromStatus]
		});
		return result.rows.map((row) => this.mapRow(row));
	}

	async getSessionsNeedingReminder(withinMinutes: number): Promise<ConsultationSession[]> {
		const result = await pool.query({
			text: `SELECT * FROM consultation_sessions
			       WHERE status='scheduled'
			         AND reminder_sent_at IS NULL
			         AND start_at > NOW()
			         AND start_at <= NOW() + make_interval(mins => $1::int)`,
			values: [withinMinutes]
		});
		return result.rows.map((row) => this.mapRow(row));
	}

	async markReminderSent(id: string): Promise<void> {
		await pool.query({
			text: "UPDATE consultation_sessions SET reminder_sent_at=NOW() WHERE id=$1",
			values: [id]
		});
	}

	/** Sessions whose end time has passed but that nobody closed out. */
	async completeElapsedSessions(): Promise<ConsultationSession[]> {
		const result = await pool.query(
			`UPDATE consultation_sessions SET status='completed', updated_at=NOW()
			 WHERE status='scheduled' AND end_at < NOW() RETURNING *`
		);
		return result.rows.map((row) => this.mapRow(row));
	}

	/** A first-contact request the consultant never answered before the slot passed. */
	async expireStalePendingSessions(): Promise<ConsultationSession[]> {
		const result = await pool.query(
			`UPDATE consultation_sessions SET status='cancelled', cancellation_reason='The requested time passed before it was confirmed', cancelled_at=NOW(), updated_at=NOW()
			 WHERE status='pending' AND start_at < NOW() RETURNING *`
		);
		return result.rows.map((row) => this.mapRow(row));
	}
}
