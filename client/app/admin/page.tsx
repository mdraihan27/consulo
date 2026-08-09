"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlatformAnalytics, type PlatformAnalytics } from "../_lib/api";
import { StatTile } from "../_components/StatTile";
import { Spinner } from "../_components/Spinner";

export default function AdminOverviewPage() {
	const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setAnalytics(await getPlatformAnalytics());
			} catch {
				return;
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Admin Overview</h1>
			<p className="mt-1 text-sm text-text-body">Manage Consulo's platform operations from here.</p>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-8">
						<Spinner />
					</div>
				) : analytics ? (
					<div className="grid gap-4 md:grid-cols-4">
						<StatTile label="Platform Fee Revenue" value={`$${analytics.platformFeeRevenue.toFixed(2)}`} />
						<StatTile label="Gross Contract Volume" value={`$${analytics.grossContractVolume.toFixed(2)}`} />
						<StatTile label="Open Disputes" value={String(analytics.disputes.open)} />
						<StatTile label="Total Users" value={String(analytics.users.total)} />
					</div>
				) : null}
			</div>

			<div className="mt-8 grid gap-4 md:grid-cols-2">
				<Link
					href="/admin/disputes"
					className="rounded-lg border border-border bg-base p-5 hover:border-accent transition"
				>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Operations</p>
					<h2 className="mt-2 text-lg font-semibold text-text-primary">Disputes</h2>
					<p className="mt-1 text-sm text-text-body">Review evidence and resolve contract disputes.</p>
				</Link>
				<Link
					href="/admin/users"
					className="rounded-lg border border-border bg-base p-5 hover:border-accent transition"
				>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Operations</p>
					<h2 className="mt-2 text-lg font-semibold text-text-primary">Users</h2>
					<p className="mt-1 text-sm text-text-body">View and manage all accounts on the platform.</p>
				</Link>
				<Link
					href="/admin/analytics"
					className="rounded-lg border border-border bg-base p-5 hover:border-accent transition"
				>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Insights</p>
					<h2 className="mt-2 text-lg font-semibold text-text-primary">Analytics</h2>
					<p className="mt-1 text-sm text-text-body">Platform-wide contract and dispute metrics.</p>
				</Link>
				<Link
					href="/admin/audit-log"
					className="rounded-lg border border-border bg-base p-5 hover:border-accent transition"
				>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Accountability</p>
					<h2 className="mt-2 text-lg font-semibold text-text-primary">Audit Log</h2>
					<p className="mt-1 text-sm text-text-body">A record of every admin action taken.</p>
				</Link>
				<Link
					href="/admin/invites"
					className="rounded-lg border border-border bg-base p-5 hover:border-accent transition"
				>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Access</p>
					<h2 className="mt-2 text-lg font-semibold text-text-primary">Admin Invites</h2>
					<p className="mt-1 text-sm text-text-body">Invite new administrators or revoke pending invites.</p>
				</Link>
			</div>
		</div>
	);
}
