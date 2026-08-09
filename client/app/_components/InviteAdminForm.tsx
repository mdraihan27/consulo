"use client";

import { FormEvent, useState } from "react";
import { inviteAdmin, type AdminInvite } from "../_lib/api";
import { Button } from "./Button";

export function InviteAdminForm({ onInvited }: { onInvited: (invite: AdminInvite) => void }) {
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!email.trim()) return;
		setIsSubmitting(true);
		setError(null);
		try {
			const invite = await inviteAdmin(email.trim());
			onInvited(invite);
			setEmail("");
		} catch (err: any) {
			setError(String(err?.message || "Failed to send invite"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
			<div className="flex-1">
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="newadmin@example.com"
					className="w-full rounded-md border border-border-strong bg-base px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
				/>
				{error && <p className="mt-2 text-sm text-accent">{error}</p>}
			</div>
			<Button type="submit" disabled={isSubmitting || !email.trim()}>
				{isSubmitting ? "Sending..." : "Send Invite"}
			</Button>
		</form>
	);
}
