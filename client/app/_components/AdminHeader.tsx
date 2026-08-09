"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../_lib/api";
import { AppHeader } from "./AppHeader";

export function AdminHeader() {
	const router = useRouter();

	async function onLogout() {
		await logout();
		router.push("/login");
	}

	return (
		<AppHeader
			subtitle="Admin"
			showNotifications
			right={
				<>
					<Link href="/admin" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						Overview
					</Link>
					<Link href="/admin/disputes" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						Disputes
					</Link>
					<Link href="/admin/users" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						Users
					</Link>
					<Link href="/admin/analytics" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						Analytics
					</Link>
					<Link href="/admin/audit-log" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						Audit Log
					</Link>
					<Link href="/admin/invites" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						Admin Invites
					</Link>
					<Link href="/dashboard" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						Back to App
					</Link>
					<button
						type="button"
						onClick={onLogout}
						className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft cursor-pointer"
					>
						Log out
					</button>
				</>
			}
		/>
	);
}
