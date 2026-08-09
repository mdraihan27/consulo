export type SessionStatus = "pending" | "scheduled" | "completed" | "cancelled" | "no_show";
export type SessionMode = "online" | "offline";

export const SESSION_ACTIVE_STATUSES: SessionStatus[] = ["pending", "scheduled"];

export type SchedulingSettings = {
	timezone: string;
	sessionDurationMinutes: number;
	bufferMinutes: number;
	minNoticeHours: number;
	bookingHorizonDays: number;
};

export const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
	timezone: "UTC",
	sessionDurationMinutes: 60,
	bufferMinutes: 0,
	minNoticeHours: 12,
	bookingHorizonDays: 30
};

export type AvailabilityRule = {
	id: string;
	userId: string;
	weekday: number; // 0 = Sunday .. 6 = Saturday
	startMinute: number; // minutes from local midnight
	endMinute: number;
};

export type TimeOffBlock = {
	id: string;
	userId: string;
	startAt: Date;
	endAt: Date;
	reason: string;
};

export type BusyInterval = {
	startAt: Date;
	endAt: Date;
};

export type OpenSlot = {
	startAt: string; // ISO-8601 UTC instant
	endAt: string;
};

export class ConsultationSession {
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
	cancelledBy: string | null;
	cancellationReason: string | null;
	cancelledAt: Date | null;
	rescheduledFromId: string | null;
	reminderSentAt: Date | null;
	createdAt: Date;
	updatedAt: Date;

	constructor(init: {
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
		cancelledBy: string | null;
		cancellationReason: string | null;
		cancelledAt: Date | null;
		rescheduledFromId: string | null;
		reminderSentAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	}) {
		this.id = init.id;
		this.bookingId = init.bookingId;
		this.clientId = init.clientId;
		this.consultantId = init.consultantId;
		this.startAt = init.startAt;
		this.endAt = init.endAt;
		this.mode = init.mode;
		this.location = init.location;
		this.agenda = init.agenda;
		this.status = init.status;
		this.cancelledBy = init.cancelledBy;
		this.cancellationReason = init.cancellationReason;
		this.cancelledAt = init.cancelledAt;
		this.rescheduledFromId = init.rescheduledFromId;
		this.reminderSentAt = init.reminderSentAt;
		this.createdAt = init.createdAt;
		this.updatedAt = init.updatedAt;
	}
}
