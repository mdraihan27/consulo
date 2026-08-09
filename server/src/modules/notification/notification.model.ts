export type NotificationType =
	| "booking_request"
	| "booking_response"
	| "new_message"
	| "contract_created"
	| "contract_funded"
	| "contract_accepted"
	| "completion_requested"
	| "contract_completed"
	| "dispute_raised"
	| "dispute_resolved"
	| "review_received"
	| "review_reply"
	| "session_booked"
	| "session_rescheduled"
	| "session_cancelled"
	| "session_reminder";

export class Notification {
	id: string;
	userId: string;
	type: NotificationType;
	title: string;
	body: string;
	link: string | null;
	isRead: boolean;
	createdAt: Date;

	constructor(
		id: string,
		userId: string,
		type: NotificationType,
		title: string,
		body: string,
		link: string | null,
		isRead: boolean,
		createdAt: Date
	) {
		this.id = id;
		this.userId = userId;
		this.type = type;
		this.title = title;
		this.body = body;
		this.link = link;
		this.isRead = isRead;
		this.createdAt = createdAt;
	}
}
