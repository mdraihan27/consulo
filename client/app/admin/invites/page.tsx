"use client";

import { useEffect, useState } from "react";
import { listAdminInvites, type AdminInvite } from "../../_lib/api";
import { InviteAdminForm } from "../../_components/InviteAdminForm";
import { AdminInviteListItem } from "../../_components/AdminInviteListItem";
import { Spinner } from "../../_components/Spinner";

export default function AdminInvitesPage() {
	const [invites, setInvites] = useState<AdminInvite[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setInvites(await listAdminInvites());
			} catch (e: any) {
				setError(String(e?.message || "Failed to load invites"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	function handleInvited(invite: AdminInvite) {
		setInvites((prev) => [invite, ...prev]);
	}

	function handleRevoked(id: string) {
		setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, status: "revoked" } : i)));
	}

	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Admin Invites</h1>
			<p className="mt-1 text-sm text-text-body">
				Invite a Consulo user to become an administrator. They gain admin access the next time they sign in with Google.
			</p>

			<div className="mt-6 rounded-lg border border-border bg-base p-5">
				<InviteAdminForm onInvited={handleInvited} />
			</div>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : error ? (
					<p className="text-sm text-accent">{error}</p>
				) : invites.length === 0 ? (
					<p className="text-sm text-text-body">No admin invites yet.</p>
				) : (
					<div className="space-y-3">
						{invites.map((invite) => (
							<AdminInviteListItem key={invite.id} invite={invite} onRevoked={handleRevoked} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
