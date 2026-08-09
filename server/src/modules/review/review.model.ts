export class Review {
	id: string;
	contractId: string;
	reviewerId: string;
	revieweeId: string;
	rating: number;
	comment: string;
	reply: string | null;
	createdAt: Date;
	repliedAt: Date | null;

	constructor(
		id: string,
		contractId: string,
		reviewerId: string,
		revieweeId: string,
		rating: number,
		comment: string,
		reply: string | null,
		createdAt: Date,
		repliedAt: Date | null
	) {
		this.id = id;
		this.contractId = contractId;
		this.reviewerId = reviewerId;
		this.revieweeId = revieweeId;
		this.rating = rating;
		this.comment = comment;
		this.reply = reply;
		this.createdAt = createdAt;
		this.repliedAt = repliedAt;
	}
}
