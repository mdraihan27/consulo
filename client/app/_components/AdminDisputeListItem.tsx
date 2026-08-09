import Link from "next/link";
import type { AdminDispute } from "../_lib/api";
import { DisputeStatusBadge } from "./DisputeStatusBadge";

export function AdminDisputeListItem({ dispute }: { dispute: AdminDispute }) {
	return (
		<Link
			href={`/admin/disputes/${dispute.id}`}
			className="flex items-center justify-between gap-4 rounded-md border border-border bg-base p-4 hover:border-accent/50 transition"
		>
			<div className="min-w-0">
				<p className="truncate text-sm font-semibold text-text-primary">{dispute.contractTitle}</p>
				<p className="mt-1 text-xs text-text-muted">
					${dispute.contractAmount.toFixed(2)} · Raised {new Date(dispute.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
				</p>
			</div>
			<DisputeStatusBadge status={dispute.status} />
		</Link>
	);
}
