import type { AuditLogEntry } from "../_lib/api";

const ACTION_LABEL: Record<string, string> = {
	invite_admin: "Invited admin",
	revoke_admin_invite: "Revoked admin invite",
	begin_dispute_review: "Began dispute review",
	resolve_dispute: "Resolved dispute",
	suspend_user: "Suspended user",
	unsuspend_user: "Unsuspended user"
};

export function AuditLogItem({ entry }: { entry: AuditLogEntry }) {
	const adminName = `${entry.adminFirstName || ""} ${entry.adminLastName || ""}`.trim() || entry.adminUsername;

	return (
		<div className="rounded-md border border-border bg-base p-4">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm font-semibold text-text-primary">{ACTION_LABEL[entry.action] || entry.action}</p>
				<span className="text-xs text-text-muted">
					{new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
				</span>
			</div>
			<p className="mt-1 text-xs text-text-muted">By {adminName}</p>
			{entry.details && <p className="mt-2 text-sm text-text-body">{entry.details}</p>}
		</div>
	);
}
