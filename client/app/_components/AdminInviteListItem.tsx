"use client";

import { useState } from "react";
import { revokeAdminInvite, type AdminInvite } from "../_lib/api";
import { Badge } from "./Badge";
import { Button } from "./Button";

const STATUS_LABEL: Record<AdminInvite["status"], string> = {
	pending: "Pending",
	accepted: "Accepted",
	revoked: "Revoked"
};

export function AdminInviteListItem({ invite, onRevoked }: { invite: AdminInvite; onRevoked: (id: string) => void }) {
	const [isRevoking, setIsRevoking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleRevoke() {
		setIsRevoking(true);
		setError(null);
		try {
			await revokeAdminInvite(invite.id);
			onRevoked(invite.id);
		} catch (err: any) {
			setError(String(err?.message || "Failed to revoke invite"));
			setIsRevoking(false);
		}
	}

	return (
		<div className="flex items-center justify-between gap-4 rounded-md border border-border bg-base p-4">
			<div className="min-w-0">
				<p className="truncate text-sm font-semibold text-text-primary">{invite.email}</p>
				<p className="mt-1 text-xs text-text-muted">
					Invited {new Date(invite.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
				</p>
				{error && <p className="mt-1 text-xs text-accent">{error}</p>}
			</div>
			<div className="flex items-center gap-3">
				<Badge tone={invite.status === "accepted" ? "accent" : "neutral"}>{STATUS_LABEL[invite.status]}</Badge>
				{invite.status === "pending" && (
					<Button variant="secondary" onClick={handleRevoke} disabled={isRevoking}>
						{isRevoking ? "Revoking..." : "Revoke"}
					</Button>
				)}
			</div>
		</div>
	);
}
