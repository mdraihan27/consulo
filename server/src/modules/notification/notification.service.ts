import { v4 as uuidv4 } from "uuid";
import { NotificationRepository } from "./notification.repository";
import { UserRepository } from "../user/user.repository";
import { EmailHandler } from "../../utils/emailHandler";
import { NotificationType } from "./notification.model";
import { ConsuloError } from "../../utils/errorHandler";

const EMAIL_WORTHY_TYPES: NotificationType[] = [
	"booking_request",
	"booking_response",
	"contract_funded",
	"completion_requested",
	"contract_completed",
	"dispute_raised",
	"dispute_resolved",
	"session_booked",
	"session_rescheduled",
	"session_cancelled",
	"session_reminder"
];

export class NotificationService {
	private notificationRepository = new NotificationRepository();
	private userRepository = new UserRepository();
	private emailHandler = new EmailHandler();

	async notify(userId: string, type: NotificationType, title: string, body: string, link: string | null = null) {
		const notification = await this.notificationRepository.create(uuidv4(), userId, type, title, body, link);

		if (EMAIL_WORTHY_TYPES.includes(type)) {
			const user = await this.userRepository.getUserById(userId);
			if (user?.email) {
				await this.emailHandler.sendEmail(user.email, title, body);
			}
		}

		return notification;
	}

	async getForUser(userId: string) {
		const [notifications, unreadCount] = await Promise.all([
			this.notificationRepository.getForUser(userId),
			this.notificationRepository.getUnreadCount(userId)
		]);
		return { notifications, unreadCount };
	}

	async markRead(userId: string, notificationId: string) {
		const updated = await this.notificationRepository.markRead(notificationId, userId);
		if (!updated) {
			throw new ConsuloError(404, "Notification not found");
		}
		return updated;
	}

	async markAllRead(userId: string) {
		await this.notificationRepository.markAllRead(userId);
	}
}
