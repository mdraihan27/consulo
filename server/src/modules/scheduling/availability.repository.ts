import { pool } from "../../config/db";
import {
	AvailabilityRule,
	DEFAULT_SCHEDULING_SETTINGS,
	SchedulingSettings,
	TimeOffBlock
} from "./scheduling.model";

export class AvailabilityRepository {
	private mapRowToRule(row: any): AvailabilityRule {
		return {
			id: row.id,
			userId: row.user_id,
			weekday: Number(row.weekday),
			startMinute: Number(row.start_minute),
			endMinute: Number(row.end_minute)
		};
	}

	private mapRowToTimeOff(row: any): TimeOffBlock {
		return {
			id: row.id,
			userId: row.user_id,
			startAt: row.start_at,
			endAt: row.end_at,
			reason: row.reason
		};
	}

	async getSettings(userId: string): Promise<SchedulingSettings | null> {
		const result = await pool.query({
			text: `SELECT timezone, session_duration_minutes, buffer_minutes, min_notice_hours, booking_horizon_days
			       FROM freelancer_profiles WHERE user_id=$1`,
			values: [userId]
		});
		const row = result.rows[0];
		if (!row) return null;

		return {
			timezone: row.timezone || DEFAULT_SCHEDULING_SETTINGS.timezone,
			sessionDurationMinutes: Number(row.session_duration_minutes),
			bufferMinutes: Number(row.buffer_minutes),
			minNoticeHours: Number(row.min_notice_hours),
			bookingHorizonDays: Number(row.booking_horizon_days)
		};
	}

	async updateSettings(userId: string, settings: SchedulingSettings): Promise<SchedulingSettings | null> {
		const result = await pool.query({
			text: `UPDATE freelancer_profiles
			       SET timezone=$1, session_duration_minutes=$2, buffer_minutes=$3, min_notice_hours=$4, booking_horizon_days=$5
			       WHERE user_id=$6
			       RETURNING timezone, session_duration_minutes, buffer_minutes, min_notice_hours, booking_horizon_days`,
			values: [
				settings.timezone,
				settings.sessionDurationMinutes,
				settings.bufferMinutes,
				settings.minNoticeHours,
				settings.bookingHorizonDays,
				userId
			]
		});
		const row = result.rows[0];
		if (!row) return null;

		return {
			timezone: row.timezone,
			sessionDurationMinutes: Number(row.session_duration_minutes),
			bufferMinutes: Number(row.buffer_minutes),
			minNoticeHours: Number(row.min_notice_hours),
			bookingHorizonDays: Number(row.booking_horizon_days)
		};
	}

	async getRules(userId: string): Promise<AvailabilityRule[]> {
		const result = await pool.query({
			text: `SELECT * FROM availability_rules WHERE user_id=$1 ORDER BY weekday ASC, start_minute ASC`,
			values: [userId]
		});
		return result.rows.map((row) => this.mapRowToRule(row));
	}

	/** Availability is edited as a whole week, so writes replace the rule set atomically. */
	async replaceRules(
		userId: string,
		rules: Array<{ id: string; weekday: number; startMinute: number; endMinute: number }>
	): Promise<AvailabilityRule[]> {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query({ text: "DELETE FROM availability_rules WHERE user_id=$1", values: [userId] });

			for (const rule of rules) {
				await client.query({
					text: `INSERT INTO availability_rules (id, user_id, weekday, start_minute, end_minute)
					       VALUES ($1,$2,$3,$4,$5)`,
					values: [rule.id, userId, rule.weekday, rule.startMinute, rule.endMinute]
				});
			}

			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}

		return await this.getRules(userId);
	}

	async getTimeOff(userId: string, from?: Date, to?: Date): Promise<TimeOffBlock[]> {
		const values: any[] = [userId];
		let rangeClause = "";

		if (from && to) {
			values.push(from, to);
			rangeClause = " AND start_at < $3 AND end_at > $2";
		}

		const result = await pool.query({
			text: `SELECT * FROM availability_time_off WHERE user_id=$1${rangeClause} ORDER BY start_at ASC`,
			values
		});
		return result.rows.map((row) => this.mapRowToTimeOff(row));
	}

	async createTimeOff(id: string, userId: string, startAt: Date, endAt: Date, reason: string): Promise<TimeOffBlock> {
		const result = await pool.query({
			text: `INSERT INTO availability_time_off (id, user_id, start_at, end_at, reason)
			       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
			values: [id, userId, startAt, endAt, reason]
		});
		return this.mapRowToTimeOff(result.rows[0]);
	}

	async deleteTimeOff(id: string, userId: string): Promise<boolean> {
		const result = await pool.query({
			text: "DELETE FROM availability_time_off WHERE id=$1 AND user_id=$2",
			values: [id, userId]
		});
		return (result.rowCount ?? 0) > 0;
	}
}
