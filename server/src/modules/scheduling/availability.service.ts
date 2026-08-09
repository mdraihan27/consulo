import { v4 as uuidv4 } from "uuid";
import { AvailabilityRepository } from "./availability.repository";
import { SessionRepository } from "./session.repository";
import { UserRepository } from "../user/user.repository";
import { ConsuloError } from "../../utils/errorHandler";
import { isValidTimeZone } from "../../utils/timezone";
import { generateOpenSlots } from "./slotGenerator";
import { AvailabilityRule, OpenSlot, SchedulingSettings } from "./scheduling.model";

const MAX_SLOT_RANGE_DAYS = 62;

type RuleInput = { weekday: number; startMinute: number; endMinute: number };

export class AvailabilityService {
	private availabilityRepository = new AvailabilityRepository();
	private sessionRepository = new SessionRepository();
	private userRepository = new UserRepository();

	private validateSettings(input: any): SchedulingSettings {
		const timezone = String(input?.timezone || "").trim();
		if (!isValidTimeZone(timezone)) {
			throw new ConsuloError(400, "A valid IANA timezone is required (for example, Asia/Dhaka)");
		}

		const sessionDurationMinutes = Number(input?.sessionDurationMinutes);
		if (!Number.isInteger(sessionDurationMinutes) || sessionDurationMinutes < 15 || sessionDurationMinutes > 480) {
			throw new ConsuloError(400, "Session length must be a whole number of minutes between 15 and 480");
		}
		if (sessionDurationMinutes % 5 !== 0) {
			throw new ConsuloError(400, "Session length must be a multiple of 5 minutes");
		}

		const bufferMinutes = Number(input?.bufferMinutes ?? 0);
		if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
			throw new ConsuloError(400, "Buffer between sessions must be between 0 and 120 minutes");
		}

		const minNoticeHours = Number(input?.minNoticeHours ?? 12);
		if (!Number.isInteger(minNoticeHours) || minNoticeHours < 0 || minNoticeHours > 168) {
			throw new ConsuloError(400, "Minimum notice must be between 0 and 168 hours");
		}

		const bookingHorizonDays = Number(input?.bookingHorizonDays ?? 30);
		if (!Number.isInteger(bookingHorizonDays) || bookingHorizonDays < 1 || bookingHorizonDays > 180) {
			throw new ConsuloError(400, "Booking window must be between 1 and 180 days ahead");
		}

		return { timezone, sessionDurationMinutes, bufferMinutes, minNoticeHours, bookingHorizonDays };
	}

	private validateRules(input: any): RuleInput[] {
		if (!Array.isArray(input)) {
			throw new ConsuloError(400, "Availability rules must be a list");
		}
		if (input.length > 50) {
			throw new ConsuloError(400, "That is more availability windows than we can store (50 max)");
		}

		const rules: RuleInput[] = input.map((raw: any) => {
			const weekday = Number(raw?.weekday);
			const startMinute = Number(raw?.startMinute);
			const endMinute = Number(raw?.endMinute);

			if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
				throw new ConsuloError(400, "Each availability window needs a weekday between 0 (Sunday) and 6 (Saturday)");
			}
			if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute >= 1440) {
				throw new ConsuloError(400, "Availability start times must fall within the day");
			}
			if (!Number.isInteger(endMinute) || endMinute <= 0 || endMinute > 1440) {
				throw new ConsuloError(400, "Availability end times must fall within the day");
			}
			if (endMinute <= startMinute) {
				throw new ConsuloError(400, "Each availability window must end after it starts");
			}

			return { weekday, startMinute, endMinute };
		});

		const byWeekday = new Map<number, RuleInput[]>();
		for (const rule of rules) {
			const bucket = byWeekday.get(rule.weekday) ?? [];
			bucket.push(rule);
			byWeekday.set(rule.weekday, bucket);
		}
		for (const bucket of byWeekday.values()) {
			bucket.sort((a, b) => a.startMinute - b.startMinute);
			for (let i = 1; i < bucket.length; i += 1) {
				if (bucket[i].startMinute < bucket[i - 1].endMinute) {
					throw new ConsuloError(400, "Availability windows on the same day cannot overlap");
				}
			}
		}

		return rules;
	}

	private async requireConsultantSettings(userId: string): Promise<SchedulingSettings> {
		const settings = await this.availabilityRepository.getSettings(userId);
		if (!settings) {
			throw new ConsuloError(400, "Set up your consultant profile before managing availability");
		}
		return settings;
	}

	async getMyAvailability(userId: string) {
		const settings = await this.requireConsultantSettings(userId);
		const [rules, timeOff] = await Promise.all([
			this.availabilityRepository.getRules(userId),
			this.availabilityRepository.getTimeOff(userId)
		]);
		return { settings, rules, timeOff };
	}

	async updateAvailability(userId: string, payload: { settings: any; rules: any }) {
		await this.requireConsultantSettings(userId);

		const settings = this.validateSettings(payload?.settings);
		const rules = this.validateRules(payload?.rules);

		const tooShort = rules.find((rule) => rule.endMinute - rule.startMinute < settings.sessionDurationMinutes);
		if (tooShort) {
			throw new ConsuloError(
				400,
				`Every availability window must be at least one session long (${settings.sessionDurationMinutes} minutes)`
			);
		}

		const [savedSettings, savedRules] = await Promise.all([
			this.availabilityRepository.updateSettings(userId, settings),
			this.availabilityRepository.replaceRules(
				userId,
				rules.map((rule) => ({ id: uuidv4(), ...rule }))
			)
		]);

		const timeOff = await this.availabilityRepository.getTimeOff(userId);
		return { settings: savedSettings ?? settings, rules: savedRules as AvailabilityRule[], timeOff };
	}

	async addTimeOff(userId: string, startAtIso: string, endAtIso: string, reason: string) {
		await this.requireConsultantSettings(userId);

		const startAt = new Date(startAtIso);
		const endAt = new Date(endAtIso);
		if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
			throw new ConsuloError(400, "Time off needs a valid start and end");
		}
		if (endAt <= startAt) {
			throw new ConsuloError(400, "Time off must end after it starts");
		}

		const block = await this.availabilityRepository.createTimeOff(
			uuidv4(),
			userId,
			startAt,
			endAt,
			(reason || "").trim()
		);

		// Existing bookings are not silently dropped — the consultant is told what
		// now clashes so they can reschedule or cancel deliberately.
		const clashing = await this.sessionRepository.getBusyIntervals(userId, startAt, endAt);
		return { timeOff: block, clashingSessionCount: clashing.length };
	}

	async removeTimeOff(userId: string, timeOffId: string) {
		const deleted = await this.availabilityRepository.deleteTimeOff(timeOffId, userId);
		if (!deleted) {
			throw new ConsuloError(404, "Time off not found");
		}
	}

	/**
	 * Resolve `excludeSessionId` to a session the requester may actually ignore.
	 * Rescheduling needs its own slot back; nobody else gets to peek past a booking.
	 */
	private async resolveExclusion(
		consultantId: string,
		excludeSessionId?: string,
		requesterId?: string
	): Promise<string | undefined> {
		if (!excludeSessionId || !requesterId) return undefined;

		const session = await this.sessionRepository.getSessionById(excludeSessionId);
		if (!session) return undefined;
		if (session.consultantId !== consultantId) return undefined;
		if (session.clientId !== requesterId && session.consultantId !== requesterId) return undefined;

		return session.id;
	}

	async getOpenSlots(
		consultantId: string,
		fromIso?: string,
		toIso?: string,
		excludeSessionId?: string,
		requesterId?: string
	): Promise<{
		consultantId: string;
		timezone: string;
		sessionDurationMinutes: number;
		slots: OpenSlot[];
	}> {
		const exclusion = await this.resolveExclusion(consultantId, excludeSessionId, requesterId);
		return await this.computeOpenSlots(consultantId, fromIso, toIso, exclusion);
	}

	/** Slot expansion proper. Callers are responsible for vetting `exclusion`. */
	private async computeOpenSlots(
		consultantId: string,
		fromIso?: string,
		toIso?: string,
		exclusion?: string
	): Promise<{
		consultantId: string;
		timezone: string;
		sessionDurationMinutes: number;
		slots: OpenSlot[];
	}> {
		const consultant = await this.userRepository.getUserById(consultantId);
		if (!consultant) throw new ConsuloError(404, "Consultant not found");
		if (consultant.role !== "freelancer") {
			throw new ConsuloError(400, "That user does not take consultations");
		}

		const settings = await this.availabilityRepository.getSettings(consultantId);
		if (!settings) {
			return { consultantId, timezone: "UTC", sessionDurationMinutes: 60, slots: [] };
		}

		const now = new Date();
		const from = fromIso ? new Date(fromIso) : now;
		const defaultTo = new Date(now.getTime() + settings.bookingHorizonDays * 24 * 60 * 60 * 1000);
		const to = toIso ? new Date(toIso) : defaultTo;

		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
			throw new ConsuloError(400, "Invalid date range");
		}
		if (to <= from) {
			return { consultantId, timezone: settings.timezone, sessionDurationMinutes: settings.sessionDurationMinutes, slots: [] };
		}
		if (to.getTime() - from.getTime() > MAX_SLOT_RANGE_DAYS * 24 * 60 * 60 * 1000) {
			throw new ConsuloError(400, `Slot lookups are limited to ${MAX_SLOT_RANGE_DAYS} days at a time`);
		}

		const [rules, timeOff, busy] = await Promise.all([
			this.availabilityRepository.getRules(consultantId),
			this.availabilityRepository.getTimeOff(consultantId, from, to),
			this.sessionRepository.getBusyIntervals(consultantId, from, to, exclusion)
		]);

		const slots = generateOpenSlots({ settings, rules, timeOff, busy, from, to, now });

		return {
			consultantId,
			timezone: settings.timezone,
			sessionDurationMinutes: settings.sessionDurationMinutes,
			slots
		};
	}

	/**
	 * Confirm a requested start is still one of the consultant's published slots.
	 * Booking goes through this rather than trusting a client-supplied time.
	 */
	async resolveSlot(
		consultantId: string,
		startAtIso: string,
		excludeSessionId?: string
	): Promise<{ startAt: Date; endAt: Date; settings: SchedulingSettings }> {
		const startAt = new Date(startAtIso);
		if (Number.isNaN(startAt.getTime())) {
			throw new ConsuloError(400, "A valid session start time is required");
		}

		const settings = await this.availabilityRepository.getSettings(consultantId);
		if (!settings) {
			throw new ConsuloError(400, "This consultant has not set up scheduling yet");
		}

		// The caller has already checked that `excludeSessionId` is the requester's
		// own session, so this goes straight to slot expansion.
		const windowEnd = new Date(startAt.getTime() + settings.sessionDurationMinutes * 60 * 1000);
		const { slots } = await this.computeOpenSlots(
			consultantId,
			startAt.toISOString(),
			windowEnd.toISOString(),
			excludeSessionId
		);
		const match = slots.find((slot) => slot.startAt === startAt.toISOString());

		if (!match) {
			throw new ConsuloError(409, "That time is no longer available. Pick another slot.");
		}

		return { startAt, endAt: new Date(match.endAt), settings };
	}
}
