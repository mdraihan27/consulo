export type ContractStatus =
	| "pending_payment"
	| "funded"
	| "in_progress"
	| "completion_requested"
	| "completed"
	| "disputed"
	| "cancelled";

export class Contract {
	id: string;
	bookingId: string;
	clientId: string;
	consultantId: string;
	title: string;
	amount: number;
	platformFeePercent: number;
	status: ContractStatus;
	createdAt: Date;
	updatedAt: Date;

	constructor(
		id: string,
		bookingId: string,
		clientId: string,
		consultantId: string,
		title: string,
		amount: number,
		platformFeePercent: number,
		status: ContractStatus,
		createdAt: Date,
		updatedAt: Date
	) {
		this.id = id;
		this.bookingId = bookingId;
		this.clientId = clientId;
		this.consultantId = consultantId;
		this.title = title;
		this.amount = amount;
		this.platformFeePercent = platformFeePercent;
		this.status = status;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	get platformFeeAmount(): number {
		return Math.round(this.amount * (this.platformFeePercent / 100) * 100) / 100;
	}

	get consultantPayoutAmount(): number {
		return Math.round((this.amount - this.platformFeeAmount) * 100) / 100;
	}
}

export type ContractTransactionType = "payment" | "release" | "platform_fee" | "refund";

export class ContractTransaction {
	id: string;
	contractId: string;
	type: ContractTransactionType;
	amount: number;
	createdAt: Date;

	constructor(id: string, contractId: string, type: ContractTransactionType, amount: number, createdAt: Date) {
		this.id = id;
		this.contractId = contractId;
		this.type = type;
		this.amount = amount;
		this.createdAt = createdAt;
	}
}
