"use client";

import { useEffect, useState } from "react";
import { getPlatformAnalytics, type PlatformAnalytics } from "../../_lib/api";
import { StatTile } from "../../_components/StatTile";
import { Spinner } from "../../_components/Spinner";

export default function AdminAnalyticsPage() {
	const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setAnalytics(await getPlatformAnalytics());
			} catch (e: any) {
				setError(String(e?.message || "Failed to load analytics"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Platform Analytics</h1>
			<p className="mt-1 text-sm text-text-body">Snapshot of Consulo's marketplace activity.</p>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : error || !analytics ? (
					<p className="text-sm text-accent">{error || "No data"}</p>
				) : (
					<div className="grid gap-4 md:grid-cols-3">
						<StatTile label="Gross Contract Volume" value={`$${analytics.grossContractVolume.toFixed(2)}`} />
						<StatTile label="Platform Fee Revenue" value={`$${analytics.platformFeeRevenue.toFixed(2)}`} sublabel="5% of completed contracts" />
						<StatTile label="Total Contracts" value={String(analytics.contracts.total)} sublabel={`${analytics.contracts.completed} completed`} />
						<StatTile label="Disputed Contracts" value={String(analytics.contracts.disputed)} />
						<StatTile label="Cancelled Contracts" value={String(analytics.contracts.cancelled)} />
						<StatTile label="Open Disputes" value={String(analytics.disputes.open)} sublabel={`${analytics.disputes.total} total`} />
						<StatTile label="Total Users" value={String(analytics.users.total)} sublabel={`${analytics.users.clients} clients, ${analytics.users.consultants} consultants`} />
						<StatTile label="Suspended Users" value={String(analytics.users.suspended)} />
					</div>
				)}
			</div>
		</div>
	);
}
