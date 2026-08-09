export class FavoriteConsultant {
	id: string;
	clientId: string;
	consultantId: string;
	createdAt: Date;

	constructor(id: string, clientId: string, consultantId: string, createdAt: Date) {
		this.id = id;
		this.clientId = clientId;
		this.consultantId = consultantId;
		this.createdAt = createdAt;
	}
}
