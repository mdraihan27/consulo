import Link from "next/link";
import type { Contract } from "../_lib/api";
import { Avatar } from "./Avatar";
import { ContractStatusBadge } from "./ContractStatusBadge";

export function ContractCard({ contract, viewerRole }: { contract: Contract; viewerRole: "client" | "freelancer" }) {
	const counterpartyName =
		viewerRole === "freelancer"
			? `${contract.clientFirstName || ""} ${contract.clientLastName || ""}`.trim()
			: `${contract.consultantFirstName || ""} ${contract.consultantLastName || ""}`.trim();
	const counterpartyPic = viewerRole === "freelancer" ? contract.clientProfilePicture : contract.consultantProfilePicture;

	return (
		<Link
			href={`/dashboard/contracts/${contract.id}`}
			className="flex items-center justify-between gap-4 rounded-xl border border-border bg-base p-5 hover:border-accent/50 transition"
		>
			<div className="flex items-center gap-4 min-w-0">
				<Avatar name={counterpartyName || "?"} picture={counterpartyPic} size="md" />
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-text-primary">{contract.title}</p>
					<p className="mt-1 text-xs text-text-muted">
						{counterpartyName || "Unknown"} · ${contract.amount.toFixed(2)}
					</p>
				</div>
			</div>
			<ContractStatusBadge status={contract.status} />
		</Link>
	);
}
