"use client";

import { useEffect, useState } from "react";
import { listAllDisputes, type AdminDispute } from "../../_lib/api";
import { AdminDisputeListItem } from "../../_components/AdminDisputeListItem";
import { Spinner } from "../../_components/Spinner";

export default function AdminDisputesPage() {
	const [disputes, setDisputes] = useState<AdminDispute[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setDisputes(await listAllDisputes());
			} catch (e: any) {
				setError(String(e?.message || "Failed to load disputes"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	const openDisputes = disputes.filter((d) => d.status === "open" || d.status === "under_review");
	const resolvedDisputes = disputes.filter((d) => d.status.startsWith("resolved"));

	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Disputes</h1>
			<p className="mt-1 text-sm text-text-body">Review evidence and resolve payment disputes between clients and consultants.</p>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : error ? (
					<p className="text-sm text-accent">{error}</p>
				) : disputes.length === 0 ? (
					<p className="text-sm text-text-body">No disputes have been raised.</p>
				) : (
					<div className="space-y-8">
						<section>
							<h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
								Needs Review ({openDisputes.length})
							</h2>
							<div className="space-y-3">
								{openDisputes.length === 0 ? (
									<p className="text-sm text-text-body">Nothing pending.</p>
								) : (
									openDisputes.map((dispute) => <AdminDisputeListItem key={dispute.id} dispute={dispute} />)
								)}
							</div>
						</section>

						<section>
							<h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">Resolved</h2>
							<div className="space-y-3">
								{resolvedDisputes.length === 0 ? (
									<p className="text-sm text-text-body">No resolved disputes yet.</p>
								) : (
									resolvedDisputes.map((dispute) => <AdminDisputeListItem key={dispute.id} dispute={dispute} />)
								)}
							</div>
						</section>
					</div>
				)}
			</div>
		</div>
	);
}
