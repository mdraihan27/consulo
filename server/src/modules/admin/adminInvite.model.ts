export type AdminInviteStatus = "pending" | "accepted" | "revoked";

export class AdminInvite {
	id: string;
	email: string;
	invitedBy: string;
	status: AdminInviteStatus;
	createdAt: Date;
	acceptedAt: Date | null;

	constructor(
		id: string,
		email: string,
		invitedBy: string,
		status: AdminInviteStatus,
		createdAt: Date,
		acceptedAt: Date | null
	) {
		this.id = id;
		this.email = email;
		this.invitedBy = invitedBy;
		this.status = status;
		this.createdAt = createdAt;
		this.acceptedAt = acceptedAt;
	}
}
