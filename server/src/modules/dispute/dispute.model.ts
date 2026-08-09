export type DisputeStatus = "open" | "under_review" | "resolved_favor_client" | "resolved_favor_consultant";

export class Dispute {
	id: string;
	contractId: string;
	raisedBy: string;
	reason: string;
	evidenceUrl: string;
	status: DisputeStatus;
	resolutionNotes: string | null;
	resolvedBy: string | null;
	createdAt: Date;
	resolvedAt: Date | null;

	constructor(
		id: string,
		contractId: string,
		raisedBy: string,
		reason: string,
		evidenceUrl: string,
		status: DisputeStatus,
		resolutionNotes: string | null,
		resolvedBy: string | null,
		createdAt: Date,
		resolvedAt: Date | null
	) {
		this.id = id;
		this.contractId = contractId;
		this.raisedBy = raisedBy;
		this.reason = reason;
		this.evidenceUrl = evidenceUrl;
		this.status = status;
		this.resolutionNotes = resolutionNotes;
		this.resolvedBy = resolvedBy;
		this.createdAt = createdAt;
		this.resolvedAt = resolvedAt;
	}
}
