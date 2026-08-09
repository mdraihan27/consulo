export type BookingStatus = "pending" | "accepted" | "declined" | "completed";

export class Booking {
	id: string;
	clientId: string;
	consultantId: string;
	message: string;
	status: BookingStatus;
	createdAt: Date;
	updatedAt: Date;

	constructor(
		id: string,
		clientId: string,
		consultantId: string,
		message: string,
		status: BookingStatus,
		createdAt: Date,
		updatedAt: Date
	) {
		this.id = id;
		this.clientId = clientId;
		this.consultantId = consultantId;
		this.message = message;
		this.status = status;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}
}

export type ChatMessageType = "text" | "file";

export type ChatMessageProps = {
	id: string;
	bookingId: string;
	senderId: string;
	content: string;
	messageType: ChatMessageType;
	fileUrl: string | null;
	fileName: string | null;
	createdAt: Date;
};

export class ChatMessage {
	id: string;
	bookingId: string;
	senderId: string;
	content: string;
	messageType: ChatMessageType;
	fileUrl: string | null;
	fileName: string | null;
	createdAt: Date;

	constructor(props: ChatMessageProps) {
		this.id = props.id;
		this.bookingId = props.bookingId;
		this.senderId = props.senderId;
		this.content = props.content;
		this.messageType = props.messageType;
		this.fileUrl = props.fileUrl;
		this.fileName = props.fileName;
		this.createdAt = props.createdAt;
	}
}
