"use client";

import { useEffect, useState } from "react";
import { listAdminUsers, type AdminUser } from "../../_lib/api";
import { AdminUserListItem } from "../../_components/AdminUserListItem";
import { Spinner } from "../../_components/Spinner";

export default function AdminUsersPage() {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setUsers(await listAdminUsers());
			} catch (e: any) {
				setError(String(e?.message || "Failed to load users"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Users</h1>
			<p className="mt-1 text-sm text-text-body">Manage all Consulo accounts.</p>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : error ? (
					<p className="text-sm text-accent">{error}</p>
				) : (
					<div className="space-y-3">
						{users.map((user) => (
							<AdminUserListItem key={user.id} user={user} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
