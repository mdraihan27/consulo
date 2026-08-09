"use client";

import { useState } from "react";
import { setUserSuspension, type AdminUser } from "../_lib/api";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Button } from "./Button";

export function AdminUserListItem({ user }: { user: AdminUser }) {
	const [isSuspended, setIsSuspended] = useState(user.isSuspended);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const name = `${user.firstName} ${user.lastName}`.trim() || user.username;

	async function toggleSuspension() {
		setIsSubmitting(true);
		setError(null);
		try {
			await setUserSuspension(user.id, !isSuspended);
			setIsSuspended(!isSuspended);
		} catch (err: any) {
			setError(String(err?.message || "Failed to update user"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex items-center justify-between gap-4 rounded-md border border-border bg-base p-4">
			<div className="flex items-center gap-3 min-w-0">
				<Avatar name={name} picture={user.profilePicture} size="sm" />
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-text-primary">{name}</p>
					<p className="truncate text-xs text-text-muted">{user.email} · {user.contractCount} contracts</p>
					{error && <p className="text-xs text-accent">{error}</p>}
				</div>
			</div>
			<div className="flex items-center gap-3 flex-shrink-0">
				<Badge tone={user.role === "admin" ? "accent" : "neutral"}>{user.role || "unassigned"}</Badge>
				{isSuspended && <Badge tone="neutral">Suspended</Badge>}
				{user.role !== "admin" && (
					<Button variant="secondary" onClick={toggleSuspension} disabled={isSubmitting}>
						{isSubmitting ? "..." : isSuspended ? "Unsuspend" : "Suspend"}
					</Button>
				)}
			</div>
		</div>
	);
}
