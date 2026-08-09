"use client";

import { useEffect, useState } from "react";
import { getAuditLog, type AuditLogEntry } from "../../_lib/api";
import { AuditLogItem } from "../../_components/AuditLogItem";
import { Spinner } from "../../_components/Spinner";

export default function AdminAuditLogPage() {
	const [entries, setEntries] = useState<AuditLogEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setEntries(await getAuditLog());
			} catch (e: any) {
				setError(String(e?.message || "Failed to load audit log"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	return (
		<div>
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Audit Log</h1>
			<p className="mt-1 text-sm text-text-body">Every admin action, recorded for accountability.</p>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : error ? (
					<p className="text-sm text-accent">{error}</p>
				) : entries.length === 0 ? (
					<p className="text-sm text-text-body">No admin actions recorded yet.</p>
				) : (
					<div className="space-y-3">
						{entries.map((entry) => (
							<AuditLogItem key={entry.id} entry={entry} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
