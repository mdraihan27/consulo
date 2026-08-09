import { v4 as uuidv4 } from "uuid";
import { AdminInviteRepository } from "./adminInvite.repository";
import { UserRepository } from "../user/user.repository";
import { AuditLogService } from "../audit/auditLog.service";
import { ConsuloError } from "../../utils/errorHandler";
import { Regex } from "../../utils/regex";

export class AdminInviteService {
	private adminInviteRepository = new AdminInviteRepository();
	private userRepository = new UserRepository();
	private auditLogService = new AuditLogService();
	private regex = new Regex();

	private getAllowlistedEmails(): string[] {
		return (process.env.ADMIN_EMAILS || "")
			.split(",")
			.map((email) => email.trim().toLowerCase())
			.filter((email) => email.length > 0);
	}

	async inviteAdmin(invitedBy: string, email: string) {
		const normalizedEmail = email.trim().toLowerCase();
		if (!normalizedEmail || !this.regex.isValidEmail(normalizedEmail)) {
			throw new ConsuloError(400, "A valid email is required");
		}

		const existingUser = await this.userRepository.getUserByEmail(normalizedEmail);
		if (existingUser?.role === "admin") {
			throw new ConsuloError(409, "This user is already an admin");
		}

		const existingInvite = await this.adminInviteRepository.getPendingInviteByEmail(normalizedEmail);
		if (existingInvite) {
			throw new ConsuloError(409, "An invite is already pending for this email");
		}

		const invite = await this.adminInviteRepository.createInvite(uuidv4(), normalizedEmail, invitedBy);
		await this.auditLogService.record(invitedBy, "invite_admin", "admin_invite", invite.id, normalizedEmail);
		return invite;
	}

	async revokeInvite(invitedBy: string, inviteId: string) {
		const revoked = await this.adminInviteRepository.revokeInvite(inviteId, invitedBy);
		if (!revoked) {
			throw new ConsuloError(404, "Pending invite not found");
		}
		await this.auditLogService.record(invitedBy, "revoke_admin_invite", "admin_invite", inviteId, revoked.email);
		return revoked;
	}

	async listInvites() {
		return await this.adminInviteRepository.getAllInvites();
	}

	async resolveRoleForNewLogin(email: string): Promise<"admin" | null> {
		const normalizedEmail = email.trim().toLowerCase();

		if (this.getAllowlistedEmails().includes(normalizedEmail)) {
			return "admin";
		}

		const invite = await this.adminInviteRepository.getPendingInviteByEmail(normalizedEmail);
		if (invite) {
			await this.adminInviteRepository.markAccepted(invite.id);
			return "admin";
		}

		return null;
	}
}
