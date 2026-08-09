export type ApiEnvelope<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type PublicUser = {
	id: string;
	username: string;
	email: string;
	role: string | null;
	isVerified: boolean;
	firstName: string;
	lastName: string;
	bio?: string;
	profilePicture?: string;
	title?: string;
	testScore?: number | null;
	bookingsCount?: number;
	certifications?: Array<{ id: string; name: string; url: string }>;
};

async function parseJsonSafe(res: Response): Promise<any> {
	try {
		return await res.json();
	} catch {
		return null;
	}
}

async function request<T>(
	path: string,
	init?: RequestInit
): Promise<ApiEnvelope<T>> {
	const res = await fetch(path, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init?.headers || {})
		}
	});

	const body = (await parseJsonSafe(res)) as ApiEnvelope<T> | null;
	if (!res.ok) {
		const message = body?.message || `Request failed (${res.status})`;
		throw new Error(message);
	}
	if (!body) throw new Error("Unexpected response");
	return body;
}

export async function getMe(): Promise<PublicUser> {
	const envelope = await request<PublicUser>("/api/v1/user/me", { method: "GET" });
	return envelope.data;
}

export async function updateUserRole(role: "freelancer" | "client", title?: string): Promise<PublicUser> {
	const envelope = await request<PublicUser>("/api/v1/user", {
		method: "PUT",
		body: JSON.stringify({ role, title })
	});
	return envelope.data;
}

export type ProfilePatch = {
	firstName?: string;
	lastName?: string;
	username?: string;
	bio?: string;
	title?: string;
	profilePictureBase64?: string;
	removeProfilePicture?: boolean;
};

/** Only the keys you pass are changed; pass "" to clear a field. */
export async function updateProfile(patch: ProfilePatch): Promise<PublicUser> {
	const envelope = await request<PublicUser>("/api/v1/user/profile", {
		method: "PATCH",
		body: JSON.stringify(patch)
	});
	return envelope.data;
}

export async function logout(): Promise<void> {
	try {
		await request<{ ok: true }>("/api/v1/auth/logout", { method: "POST" });
	} catch {
		return;
	}
}

export async function getAssessmentQuestions(): Promise<{ questions: string[] }> {
	const envelope = await request<{ questions: string[] }>("/api/v1/user/assessment/questions", { method: "GET" });
	return envelope.data;
}

export async function submitAssessment(answers: Array<{ question: string; answer: string }>): Promise<{ score: number; feedback: string }> {
	const envelope = await request<{ score: number; feedback: string }>("/api/v1/user/assessment/submit", {
		method: "POST",
		body: JSON.stringify({ answers })
	});
	return envelope.data;
}

export async function retakeAssessment(): Promise<PublicUser> {
	const envelope = await request<PublicUser>("/api/v1/user/assessment/reset", {
		method: "POST"
	});
	return envelope.data;
}

export async function addCertification(name: string, url?: string, imageBase64?: string): Promise<{ id: string; name: string; url: string }> {
	const envelope = await request<{ id: string; name: string; url: string }>("/api/v1/user/certifications", {
		method: "POST",
		body: JSON.stringify({ name, url, imageBase64 })
	});
	return envelope.data;
}

export async function deleteCertification(id: string): Promise<void> {
	await request<{ id: string }>(`/api/v1/user/certifications/${id}`, {
		method: "DELETE"
	});
}

export type FreelancerSearchResult = {
	id: string;
	username: string;
	firstName: string;
	lastName: string;
	title: string;
	testScore: number | null;
	profilePicture: string;
	averageRating: number | null;
	reviewCount: number;
};

export type FreelancerSortBy = "relevance" | "rating" | "test_score" | "newest";

export type FreelancerSearchFilters = {
	query?: string;
	minTestScore?: number;
	minRating?: number;
	sortBy?: FreelancerSortBy;
};

export async function searchFreelancers(filters: FreelancerSearchFilters): Promise<FreelancerSearchResult[]> {
	const params = new URLSearchParams();
	if (filters.query) params.set("q", filters.query);
	if (filters.minTestScore !== undefined) params.set("minTestScore", String(filters.minTestScore));
	if (filters.minRating !== undefined) params.set("minRating", String(filters.minRating));
	if (filters.sortBy) params.set("sortBy", filters.sortBy);

	const envelope = await request<{ freelancers: FreelancerSearchResult[] }>(`/api/v1/user/freelancers/search?${params.toString()}`, {
		method: "GET"
	});
	return envelope.data.freelancers;
}

export type ConsultantProfile = {
	id: string;
	username: string;
	firstName: string;
	lastName: string;
	bio?: string;
	profilePicture?: string;
	title?: string;
	testScore?: number | null;
	certifications?: Array<{ id: string; name: string; url: string }>;
};

export async function getConsultantProfile(id: string): Promise<ConsultantProfile> {
	const envelope = await request<ConsultantProfile>(`/api/v1/user/freelancers/${id}`, { method: "GET" });
	return envelope.data;
}

export type BookingStatus = "pending" | "accepted" | "declined" | "completed";

export type Booking = {
	id: string;
	clientId: string;
	consultantId: string;
	message: string;
	status: BookingStatus;
	createdAt: string;
	updatedAt: string;
	// joined fields
	clientFirstName?: string;
	clientLastName?: string;
	clientUsername?: string;
	clientProfilePicture?: string;
	consultantFirstName?: string;
	consultantLastName?: string;
	consultantUsername?: string;
	consultantProfilePicture?: string;
	consultantTitle?: string;
};

export async function requestBookingWithSlot(
	consultantId: string,
	message: string,
	slot?: { startAt: string; mode?: "online" | "offline"; location?: string; agenda?: string }
): Promise<Booking> {
	const envelope = await request<Booking>("/api/v1/bookings", {
		method: "POST",
		body: JSON.stringify({ consultantId, message, ...(slot ?? {}) })
	});
	return envelope.data;
}

export async function requestBooking(consultantId: string, message: string): Promise<Booking> {
	const envelope = await request<Booking>("/api/v1/bookings", {
		method: "POST",
		body: JSON.stringify({ consultantId, message })
	});
	return envelope.data;
}

export async function respondToBooking(bookingId: string, action: "accepted" | "declined"): Promise<Booking> {
	const envelope = await request<Booking>(`/api/v1/bookings/${bookingId}/respond`, {
		method: "PATCH",
		body: JSON.stringify({ action })
	});
	return envelope.data;
}

export async function getConsultantBookings(): Promise<Booking[]> {
	const envelope = await request<{ bookings: any[] }>("/api/v1/bookings/consultant", { method: "GET" });
	return envelope.data.bookings.map((b) => ({
		id: b.id,
		clientId: b.client_id,
		consultantId: b.consultant_id,
		message: b.message,
		status: b.status,
		createdAt: b.created_at,
		updatedAt: b.updated_at,
		clientFirstName: b.client_first_name,
		clientLastName: b.client_last_name,
		clientUsername: b.client_username,
		clientProfilePicture: b.client_profile_picture,
	}));
}

export async function getClientBookings(): Promise<Booking[]> {
	const envelope = await request<{ bookings: any[] }>("/api/v1/bookings/client", { method: "GET" });
	return envelope.data.bookings.map((b) => ({
		id: b.id,
		clientId: b.client_id,
		consultantId: b.consultant_id,
		message: b.message,
		status: b.status,
		createdAt: b.created_at,
		updatedAt: b.updated_at,
		consultantFirstName: b.consultant_first_name,
		consultantLastName: b.consultant_last_name,
		consultantUsername: b.consultant_username,
		consultantProfilePicture: b.consultant_profile_picture,
		consultantTitle: b.consultant_title,
	}));
}

export type ChatMessageType = "text" | "file";

export type ChatMessage = {
	id: string;
	bookingId: string;
	senderId: string;
	content: string;
	messageType: ChatMessageType;
	fileUrl: string | null;
	fileName: string | null;
	createdAt: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	profilePicture?: string;
};

export type InboxConversation = {
	bookingId: string;
	status: string;
	clientId: string;
	consultantId: string;
	otherFirstName: string;
	otherLastName: string;
	otherUsername: string;
	otherProfilePicture?: string;
	lastMessageContent: string | null;
	lastMessageType: ChatMessageType | null;
	lastMessageAt: string | null;
	lastMessageSenderId: string | null;
	unreadCount: number;
};

export async function getInbox(): Promise<InboxConversation[]> {
	const envelope = await request<{ conversations: any[] }>("/api/v1/bookings/inbox", { method: "GET" });
	return envelope.data.conversations.map((c) => ({
		bookingId: c.booking_id,
		status: c.status,
		clientId: c.client_id,
		consultantId: c.consultant_id,
		otherFirstName: c.other_first_name,
		otherLastName: c.other_last_name,
		otherUsername: c.other_username,
		otherProfilePicture: c.other_profile_picture,
		lastMessageContent: c.last_message_content,
		lastMessageType: c.last_message_type,
		lastMessageAt: c.last_message_at,
		lastMessageSenderId: c.last_message_sender_id,
		unreadCount: c.unread_count
	}));
}

export async function markBookingRead(bookingId: string): Promise<void> {
	await request<any>(`/api/v1/bookings/${bookingId}/read`, { method: "POST" });
}

export type ContractStatus =
	| "pending_payment"
	| "funded"
	| "in_progress"
	| "completion_requested"
	| "completed"
	| "disputed"
	| "cancelled";

export type Contract = {
	id: string;
	bookingId: string;
	clientId: string;
	consultantId: string;
	title: string;
	amount: number;
	platformFeePercent: number;
	status: ContractStatus;
	createdAt: string;
	updatedAt: string;
	clientFirstName?: string;
	clientLastName?: string;
	clientUsername?: string;
	clientProfilePicture?: string;
	consultantFirstName?: string;
	consultantLastName?: string;
	consultantUsername?: string;
	consultantProfilePicture?: string;
};

export type ContractTransaction = {
	id: string;
	contractId: string;
	type: "payment" | "release" | "platform_fee" | "refund";
	amount: number;
	createdAt: string;
};

function mapContract(c: any): Contract {
	return {
		id: c.id,
		bookingId: c.booking_id,
		clientId: c.client_id,
		consultantId: c.consultant_id,
		title: c.title,
		amount: Number(c.amount),
		platformFeePercent: Number(c.platform_fee_percent),
		status: c.status,
		createdAt: c.created_at,
		updatedAt: c.updated_at,
		clientFirstName: c.client_first_name,
		clientLastName: c.client_last_name,
		clientUsername: c.client_username,
		clientProfilePicture: c.client_profile_picture,
		consultantFirstName: c.consultant_first_name,
		consultantLastName: c.consultant_last_name,
		consultantUsername: c.consultant_username,
		consultantProfilePicture: c.consultant_profile_picture
	};
}

function mapContractTransaction(t: any): ContractTransaction {
	return {
		id: t.id,
		contractId: t.contract_id,
		type: t.type,
		amount: Number(t.amount),
		createdAt: t.created_at
	};
}

export async function createContract(bookingId: string, title: string, amount: number): Promise<Contract> {
	const envelope = await request<any>("/api/v1/contracts", {
		method: "POST",
		body: JSON.stringify({ bookingId, title, amount })
	});
	return mapContract(envelope.data);
}

export async function payForContract(contractId: string): Promise<Contract> {
	const envelope = await request<any>(`/api/v1/contracts/${contractId}/pay`, { method: "POST" });
	return mapContract(envelope.data);
}

export async function acceptContract(contractId: string): Promise<Contract> {
	const envelope = await request<any>(`/api/v1/contracts/${contractId}/accept`, { method: "POST" });
	return mapContract(envelope.data);
}

export async function requestContractCompletion(contractId: string): Promise<Contract> {
	const envelope = await request<any>(`/api/v1/contracts/${contractId}/request-completion`, { method: "POST" });
	return mapContract(envelope.data);
}

export async function confirmContractCompletion(contractId: string): Promise<Contract> {
	const envelope = await request<any>(`/api/v1/contracts/${contractId}/confirm-completion`, { method: "POST" });
	return mapContract(envelope.data);
}

export async function cancelContract(contractId: string): Promise<Contract> {
	const envelope = await request<any>(`/api/v1/contracts/${contractId}/cancel`, { method: "POST" });
	return mapContract(envelope.data);
}

export async function getContract(contractId: string): Promise<{ contract: Contract; transactions: ContractTransaction[] }> {
	const envelope = await request<any>(`/api/v1/contracts/${contractId}`, { method: "GET" });
	return {
		contract: mapContract(envelope.data.contract),
		transactions: envelope.data.transactions.map(mapContractTransaction)
	};
}

export async function getMyClientContracts(): Promise<Contract[]> {
	const envelope = await request<{ contracts: any[] }>("/api/v1/contracts/client", { method: "GET" });
	return envelope.data.contracts.map(mapContract);
}

export async function getMyConsultantContracts(): Promise<Contract[]> {
	const envelope = await request<{ contracts: any[] }>("/api/v1/contracts/consultant", { method: "GET" });
	return envelope.data.contracts.map(mapContract);
}

export type FavoriteConsultant = {
	favoriteId: string;
	favoritedAt: string;
	id: string;
	username: string;
	firstName: string;
	lastName: string;
	profilePicture?: string;
	title?: string;
	testScore: number | null;
};

export async function getFavorites(): Promise<FavoriteConsultant[]> {
	const envelope = await request<{ favorites: any[] }>("/api/v1/favorites", { method: "GET" });
	return envelope.data.favorites.map((f) => ({
		favoriteId: f.favorite_id,
		favoritedAt: f.favorited_at,
		id: f.id,
		username: f.username,
		firstName: f.first_name,
		lastName: f.last_name,
		profilePicture: f.profile_picture,
		title: f.title,
		testScore: f.test_score
	}));
}

export async function addFavorite(consultantId: string): Promise<void> {
	await request<any>(`/api/v1/favorites/${consultantId}`, { method: "POST" });
}

export async function removeFavorite(consultantId: string): Promise<void> {
	await request<any>(`/api/v1/favorites/${consultantId}`, { method: "DELETE" });
}

export type Review = {
	id: string;
	contractId: string;
	reviewerId: string;
	revieweeId: string;
	rating: number;
	comment: string;
	reply: string | null;
	createdAt: string;
	repliedAt: string | null;
};

export type PublicReview = Review & {
	reviewerFirstName: string;
	reviewerLastName: string;
	reviewerUsername: string;
	reviewerProfilePicture?: string;
};

function mapReview(r: any): Review {
	return {
		id: r.id,
		contractId: r.contract_id,
		reviewerId: r.reviewer_id,
		revieweeId: r.reviewee_id,
		rating: r.rating,
		comment: r.comment,
		reply: r.reply,
		createdAt: r.created_at,
		repliedAt: r.replied_at
	};
}

export async function submitReview(contractId: string, rating: number, comment: string): Promise<Review> {
	const envelope = await request<any>("/api/v1/reviews", {
		method: "POST",
		body: JSON.stringify({ contractId, rating, comment })
	});
	return mapReview(envelope.data);
}

export async function getContractReviews(contractId: string): Promise<{ myReview: Review | null; theirReview: Review | null; isBlind: boolean }> {
	const envelope = await request<any>(`/api/v1/reviews/contract/${contractId}`, { method: "GET" });
	return {
		myReview: envelope.data.myReview ? mapReview(envelope.data.myReview) : null,
		theirReview: envelope.data.theirReview ? mapReview(envelope.data.theirReview) : null,
		isBlind: envelope.data.isBlind
	};
}

export async function replyToReview(reviewId: string, reply: string): Promise<Review> {
	const envelope = await request<any>(`/api/v1/reviews/${reviewId}/reply`, {
		method: "POST",
		body: JSON.stringify({ reply })
	});
	return mapReview(envelope.data);
}

export async function getPublicReviewsForUser(userId: string): Promise<{ reviews: PublicReview[]; averageRating: number | null; reviewCount: number }> {
	const envelope = await request<any>(`/api/v1/reviews/user/${userId}`, { method: "GET" });
	return {
		reviews: envelope.data.reviews.map((r: any) => ({
			...mapReview(r),
			reviewerFirstName: r.reviewer_first_name,
			reviewerLastName: r.reviewer_last_name,
			reviewerUsername: r.reviewer_username,
			reviewerProfilePicture: r.reviewer_profile_picture
		})),
		averageRating: envelope.data.averageRating,
		reviewCount: envelope.data.reviewCount
	};
}

export type AdminUser = {
	id: string;
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	role: string | null;
	isSuspended: boolean;
	profilePicture?: string;
	contractCount: number;
};

export async function listAdminUsers(): Promise<AdminUser[]> {
	const envelope = await request<{ users: any[] }>("/api/v1/admin/users", { method: "GET" });
	return envelope.data.users.map((u) => ({
		id: u.id,
		firstName: u.first_name,
		lastName: u.last_name,
		username: u.username,
		email: u.email,
		role: u.role,
		isSuspended: u.is_suspended,
		profilePicture: u.profile_picture,
		contractCount: u.contract_count
	}));
}

export async function setUserSuspension(userId: string, isSuspended: boolean): Promise<void> {
	await request<any>(`/api/v1/admin/users/${userId}/suspension`, {
		method: "PATCH",
		body: JSON.stringify({ isSuspended })
	});
}

export type PlatformAnalytics = {
	grossContractVolume: number;
	platformFeeRevenue: number;
	contracts: { total: number; completed: number; disputed: number; cancelled: number };
	disputes: { total: number; open: number };
	users: { total: number; clients: number; consultants: number; suspended: number };
};

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
	const envelope = await request<PlatformAnalytics>("/api/v1/admin/analytics", { method: "GET" });
	return envelope.data;
}

export type AuditLogEntry = {
	id: string;
	adminId: string;
	adminFirstName: string;
	adminLastName: string;
	adminUsername: string;
	action: string;
	targetType: string;
	targetId: string;
	details: string | null;
	createdAt: string;
};

export async function getAuditLog(): Promise<AuditLogEntry[]> {
	const envelope = await request<{ entries: any[] }>("/api/v1/admin/audit-log", { method: "GET" });
	return envelope.data.entries.map((e) => ({
		id: e.id,
		adminId: e.admin_id,
		adminFirstName: e.admin_first_name,
		adminLastName: e.admin_last_name,
		adminUsername: e.admin_username,
		action: e.action,
		targetType: e.target_type,
		targetId: e.target_id,
		details: e.details,
		createdAt: e.created_at
	}));
}

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
	| "review_reply";

export type AppNotification = {
	id: string;
	userId: string;
	type: NotificationType;
	title: string;
	body: string;
	link: string | null;
	isRead: boolean;
	createdAt: string;
};

function mapNotification(n: any): AppNotification {
	return {
		id: n.id,
		userId: n.user_id,
		type: n.type,
		title: n.title,
		body: n.body,
		link: n.link,
		isRead: n.is_read,
		createdAt: n.created_at
	};
}

export async function getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
	const envelope = await request<any>("/api/v1/notifications", { method: "GET" });
	return {
		notifications: envelope.data.notifications.map(mapNotification),
		unreadCount: envelope.data.unreadCount
	};
}

export async function markNotificationRead(notificationId: string): Promise<void> {
	await request<any>(`/api/v1/notifications/${notificationId}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
	await request<any>("/api/v1/notifications/read-all", { method: "POST" });
}

export type DisputeStatus = "open" | "under_review" | "resolved_favor_client" | "resolved_favor_consultant";

export type Dispute = {
	id: string;
	contractId: string;
	raisedBy: string;
	reason: string;
	evidenceUrl: string;
	status: DisputeStatus;
	resolutionNotes: string | null;
	resolvedBy: string | null;
	createdAt: string;
	resolvedAt: string | null;
};

export type AdminDispute = Dispute & {
	contractTitle: string;
	contractAmount: number;
	clientId: string;
	consultantId: string;
};

function mapDispute(d: any): Dispute {
	return {
		id: d.id,
		contractId: d.contract_id,
		raisedBy: d.raised_by,
		reason: d.reason,
		evidenceUrl: d.evidence_url,
		status: d.status,
		resolutionNotes: d.resolution_notes,
		resolvedBy: d.resolved_by,
		createdAt: d.created_at,
		resolvedAt: d.resolved_at
	};
}

export async function raiseDispute(contractId: string, reason: string, evidenceUrl: string): Promise<Dispute> {
	const envelope = await request<any>("/api/v1/disputes", {
		method: "POST",
		body: JSON.stringify({ contractId, reason, evidenceUrl })
	});
	return mapDispute(envelope.data);
}

export async function getDispute(disputeId: string): Promise<{ dispute: Dispute; contract: Contract }> {
	const envelope = await request<any>(`/api/v1/disputes/${disputeId}`, { method: "GET" });
	return { dispute: mapDispute(envelope.data.dispute), contract: mapContract(envelope.data.contract) };
}

export async function listAllDisputes(): Promise<AdminDispute[]> {
	const envelope = await request<{ disputes: any[] }>("/api/v1/admin/disputes", { method: "GET" });
	return envelope.data.disputes.map((d) => ({
		...mapDispute(d),
		contractTitle: d.contract_title,
		contractAmount: Number(d.contract_amount),
		clientId: d.client_id,
		consultantId: d.consultant_id
	}));
}

export async function beginDisputeReview(disputeId: string): Promise<Dispute> {
	const envelope = await request<any>(`/api/v1/admin/disputes/${disputeId}/review`, { method: "POST" });
	return mapDispute(envelope.data);
}

export async function resolveDispute(disputeId: string, outcome: "favor_client" | "favor_consultant", notes: string): Promise<Dispute> {
	const envelope = await request<any>(`/api/v1/admin/disputes/${disputeId}/resolve`, {
		method: "POST",
		body: JSON.stringify({ outcome, notes })
	});
	return mapDispute(envelope.data);
}

export type AdminInviteStatus = "pending" | "accepted" | "revoked";

export type AdminInvite = {
	id: string;
	email: string;
	invitedBy: string;
	status: AdminInviteStatus;
	createdAt: string;
	acceptedAt: string | null;
};

export async function listAdminInvites(): Promise<AdminInvite[]> {
	const envelope = await request<{ invites: any[] }>("/api/v1/admin/invites", { method: "GET" });
	return envelope.data.invites.map((i) => ({
		id: i.id,
		email: i.email,
		invitedBy: i.invited_by,
		status: i.status,
		createdAt: i.created_at,
		acceptedAt: i.accepted_at
	}));
}

export async function inviteAdmin(email: string): Promise<AdminInvite> {
	const envelope = await request<any>("/api/v1/admin/invites", {
		method: "POST",
		body: JSON.stringify({ email })
	});
	const i = envelope.data;
	return {
		id: i.id,
		email: i.email,
		invitedBy: i.invited_by,
		status: i.status,
		createdAt: i.created_at,
		acceptedAt: i.accepted_at
	};
}

export async function revokeAdminInvite(inviteId: string): Promise<void> {
	await request<any>(`/api/v1/admin/invites/${inviteId}`, { method: "DELETE" });
}

export async function getChatHistory(bookingId: string): Promise<{ booking: any; messages: ChatMessage[] }> {
	const envelope = await request<{ booking: any; messages: any[] }>(`/api/v1/bookings/${bookingId}/chat`, { method: "GET" });
	return {
		booking: envelope.data.booking,
		messages: envelope.data.messages.map((m) => ({
			id: m.id,
			bookingId: m.booking_id,
			senderId: m.sender_id,
			content: m.content,
			messageType: m.message_type,
			fileUrl: m.file_url,
			fileName: m.file_name,
			createdAt: m.created_at,
			firstName: m.first_name,
			lastName: m.last_name,
			username: m.username,
			profilePicture: m.profile_picture,
		}))
	};
}


// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export type SessionStatus = "pending" | "scheduled" | "completed" | "cancelled" | "no_show";
export type SessionMode = "online" | "offline";

export type SchedulingSettings = {
	timezone: string;
	sessionDurationMinutes: number;
	bufferMinutes: number;
	minNoticeHours: number;
	bookingHorizonDays: number;
};

export type AvailabilityRule = {
	id: string;
	userId: string;
	weekday: number;
	startMinute: number;
	endMinute: number;
};

export type TimeOffBlock = {
	id: string;
	userId: string;
	startAt: string;
	endAt: string;
	reason: string;
};

export type MyAvailability = {
	settings: SchedulingSettings;
	rules: AvailabilityRule[];
	timeOff: TimeOffBlock[];
};

export type OpenSlot = {
	startAt: string;
	endAt: string;
};

export type ConsultantSlots = {
	consultantId: string;
	timezone: string;
	sessionDurationMinutes: number;
	slots: OpenSlot[];
};

export type SessionParty = {
	firstName: string;
	lastName: string;
	profilePicture?: string;
	title?: string;
};

export type ConsultationSession = {
	id: string;
	bookingId: string;
	clientId: string;
	consultantId: string;
	startAt: string;
	endAt: string;
	mode: SessionMode;
	location: string;
	agenda: string;
	status: SessionStatus;
	cancelledBy: string | null;
	cancellationReason: string | null;
	cancelledAt: string | null;
	rescheduledFromId: string | null;
	createdAt: string;
	bookingStatus?: string;
	client: SessionParty;
	consultant: SessionParty;
};

export async function getMyAvailability(): Promise<MyAvailability> {
	const envelope = await request<MyAvailability>("/api/v1/availability/me", { method: "GET" });
	return envelope.data;
}

export async function updateMyAvailability(
	settings: SchedulingSettings,
	rules: Array<{ weekday: number; startMinute: number; endMinute: number }>
): Promise<MyAvailability> {
	const envelope = await request<MyAvailability>("/api/v1/availability/me", {
		method: "PUT",
		body: JSON.stringify({ settings, rules })
	});
	return envelope.data;
}

export async function addTimeOff(
	startAt: string,
	endAt: string,
	reason: string
): Promise<{ timeOff: TimeOffBlock; clashingSessionCount: number }> {
	const envelope = await request<{ timeOff: TimeOffBlock; clashingSessionCount: number }>(
		"/api/v1/availability/me/time-off",
		{ method: "POST", body: JSON.stringify({ startAt, endAt, reason }) }
	);
	return envelope.data;
}

export async function removeTimeOff(timeOffId: string): Promise<void> {
	await request<any>(`/api/v1/availability/me/time-off/${timeOffId}`, { method: "DELETE" });
}

export async function getConsultantSlots(
	consultantId: string,
	from?: string,
	to?: string,
	excludeSessionId?: string
): Promise<ConsultantSlots> {
	const params = new URLSearchParams();
	if (from) params.set("from", from);
	if (to) params.set("to", to);
	if (excludeSessionId) params.set("excludeSessionId", excludeSessionId);
	const suffix = params.toString() ? `?${params.toString()}` : "";

	const envelope = await request<ConsultantSlots>(`/api/v1/consultants/${consultantId}/slots${suffix}`, {
		method: "GET"
	});
	return envelope.data;
}

export async function getMySessions(): Promise<ConsultationSession[]> {
	const envelope = await request<{ sessions: ConsultationSession[] }>("/api/v1/sessions", { method: "GET" });
	return envelope.data.sessions;
}

export async function getSessionsForBooking(bookingId: string): Promise<ConsultationSession[]> {
	const envelope = await request<{ sessions: ConsultationSession[] }>(`/api/v1/bookings/${bookingId}/sessions`, {
		method: "GET"
	});
	return envelope.data.sessions;
}

export async function bookSession(input: {
	bookingId: string;
	startAt: string;
	mode?: SessionMode;
	location?: string;
	agenda?: string;
}): Promise<ConsultationSession> {
	const envelope = await request<ConsultationSession>("/api/v1/sessions", {
		method: "POST",
		body: JSON.stringify(input)
	});
	return envelope.data;
}

export async function rescheduleSession(sessionId: string, startAt: string): Promise<ConsultationSession> {
	const envelope = await request<ConsultationSession>(`/api/v1/sessions/${sessionId}/reschedule`, {
		method: "POST",
		body: JSON.stringify({ startAt })
	});
	return envelope.data;
}

export async function cancelSession(sessionId: string, reason: string): Promise<ConsultationSession> {
	const envelope = await request<ConsultationSession>(`/api/v1/sessions/${sessionId}/cancel`, {
		method: "POST",
		body: JSON.stringify({ reason })
	});
	return envelope.data;
}

export async function completeSession(sessionId: string): Promise<ConsultationSession> {
	const envelope = await request<ConsultationSession>(`/api/v1/sessions/${sessionId}/complete`, { method: "POST" });
	return envelope.data;
}

export async function markSessionNoShow(sessionId: string): Promise<ConsultationSession> {
	const envelope = await request<ConsultationSession>(`/api/v1/sessions/${sessionId}/no-show`, { method: "POST" });
	return envelope.data;
}
