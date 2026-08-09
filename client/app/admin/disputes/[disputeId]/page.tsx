"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDispute, beginDisputeReview, type Dispute, type Contract } from "../../../_lib/api";
import { DisputeStatusBadge } from "../../../_components/DisputeStatusBadge";
import { ContractStatusBadge } from "../../../_components/ContractStatusBadge";
import { ResolveDisputeForm } from "../../../_components/ResolveDisputeForm";
import { Button } from "../../../_components/Button";
import { Spinner } from "../../../_components/Spinner";

export default function AdminDisputeDetailPage() {
	const params = useParams();
	const disputeId = params?.disputeId as string;

	const [dispute, setDispute] = useState<Dispute | null>(null);
	const [contract, setContract] = useState<Contract | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isStartingReview, setIsStartingReview] = useState(false);

	useEffect(() => {
		if (!disputeId) return;
		(async () => {
			setIsLoading(true);
			try {
				const data = await getDispute(disputeId);
				setDispute(data.dispute);
				setContract(data.contract);
			} catch (e: any) {
				setError(String(e?.message || "Failed to load dispute"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, [disputeId]);

	async function handleBeginReview() {
		if (!dispute) return;
		setIsStartingReview(true);
		try {
			setDispute(await beginDisputeReview(dispute.id));
		} catch (e: any) {
			setError(String(e?.message || "Failed to start review"));
		} finally {
			setIsStartingReview(false);
		}
	}

	if (isLoading) {
		return (
			<div className="flex justify-center py-20">
				<Spinner size="md" />
			</div>
		);
	}

	if (error || !dispute || !contract) {
		return <p className="text-sm text-accent">{error || "Dispute not found"}</p>;
	}

	const canResolve = dispute.status === "open" || dispute.status === "under_review";

	return (
		<div>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Dispute</p>
					<h1 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">{contract.title}</h1>
				</div>
				<DisputeStatusBadge status={dispute.status} />
			</div>

			<div className="mt-6 grid gap-4 sm:grid-cols-3">
				<div className="rounded-md border border-border bg-base p-4">
					<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Contract Amount</p>
					<p className="mt-1 text-lg font-semibold text-text-primary">${contract.amount.toFixed(2)}</p>
				</div>
				<div className="rounded-md border border-border bg-base p-4">
					<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Contract Status</p>
					<div className="mt-2">
						<ContractStatusBadge status={contract.status} />
					</div>
				</div>
				<div className="rounded-md border border-border bg-base p-4">
					<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Raised</p>
					<p className="mt-1 text-sm font-medium text-text-primary">
						{new Date(dispute.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
					</p>
				</div>
			</div>

			<div className="mt-6 rounded-lg border border-border bg-base p-5">
				<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Consultant's Reason</p>
				<p className="mt-2 text-sm leading-relaxed text-text-body">{dispute.reason}</p>

				<p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Evidence</p>
				<a
					href={dispute.evidenceUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-2 inline-block text-sm text-accent hover:underline break-all"
				>
					{dispute.evidenceUrl}
				</a>
			</div>

			{dispute.status === "open" && (
				<div className="mt-6">
					<Button variant="secondary" onClick={handleBeginReview} disabled={isStartingReview}>
						{isStartingReview ? "Starting..." : "Mark as Under Review"}
					</Button>
				</div>
			)}

			{canResolve ? (
				<div className="mt-6 rounded-lg border border-border bg-bg-soft p-5">
					<h2 className="text-sm font-semibold text-text-primary">Resolve This Dispute</h2>
					<div className="mt-4">
						<ResolveDisputeForm disputeId={dispute.id} onResolved={setDispute} />
					</div>
				</div>
			) : (
				dispute.resolutionNotes && (
					<div className="mt-6 rounded-lg border border-border bg-bg-soft p-5">
						<h2 className="text-sm font-semibold text-text-primary">Resolution Notes</h2>
						<p className="mt-2 text-sm leading-relaxed text-text-body">{dispute.resolutionNotes}</p>
					</div>
				)
			)}
		</div>
	);
}
