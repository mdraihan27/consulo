"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getContract, type Contract, type ContractTransaction } from "../../../_lib/api";
import { useCurrentUser } from "../../../_lib/useCurrentUser";
import { Spinner } from "../../../_components/Spinner";
import { ContractStatusBadge } from "../../../_components/ContractStatusBadge";
import { ContractActionPanel } from "../../../_components/ContractActionPanel";
import { ContractLedger } from "../../../_components/ContractLedger";
import { ContractReviewSection } from "../../../_components/ContractReviewSection";
import { Avatar } from "../../../_components/Avatar";

export default function ContractDetailPage() {
	const params = useParams();
	const router = useRouter();
	const contractId = params?.contractId as string;

	const { user } = useCurrentUser();
	const [contract, setContract] = useState<Contract | null>(null);
	const [transactions, setTransactions] = useState<ContractTransaction[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!contractId) return;
		(async () => {
			setIsLoading(true);
			try {
				const data = await getContract(contractId);
				setContract(data.contract);
				setTransactions(data.transactions);
			} catch (e: any) {
				setError(String(e?.message || "Failed to load contract"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, [contractId]);

	function handleUpdated(updated: Contract) {
		setContract(updated);
	}

	function handleDispute() {
		router.push(`/dashboard/disputes/new?contractId=${contractId}`);
	}

	const viewerRole = user?.role === "freelancer" ? "freelancer" : "client";
	const counterpartyName = contract
		? viewerRole === "freelancer"
			? `${contract.clientFirstName || ""} ${contract.clientLastName || ""}`.trim()
			: `${contract.consultantFirstName || ""} ${contract.consultantLastName || ""}`.trim()
		: "";
	const counterpartyPic = contract
		? viewerRole === "freelancer"
			? contract.clientProfilePicture
			: contract.consultantProfilePicture
		: undefined;

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<div className="mb-6">
				<Link href="/dashboard/contracts" className="text-xs font-medium text-text-muted hover:text-accent transition">
					← Back to Contracts
				</Link>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-20">
					<Spinner size="md" />
				</div>
			) : error || !contract ? (
				<div className="rounded-lg border border-border bg-base p-5 text-sm text-accent">{error || "Contract not found"}</div>
			) : (
				<>
					<div className="rounded-lg border border-border bg-base p-6">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Contract</p>
								<h1 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">{contract.title}</h1>
							</div>
							<ContractStatusBadge status={contract.status} />
						</div>

						<div className="mt-5 flex items-center gap-3">
							<Avatar name={counterpartyName || "?"} picture={counterpartyPic} size="md" />
							<div>
								<p className="text-sm font-semibold text-text-primary">{counterpartyName || "Unknown"}</p>
								<p className="text-xs text-text-muted">{viewerRole === "freelancer" ? "Client" : "Consultant"}</p>
							</div>
						</div>

						<div className="mt-6 grid gap-4 sm:grid-cols-2">
							<div className="rounded-md border border-border bg-bg-soft p-4">
								<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Contract Amount</p>
								<p className="mt-1 text-lg font-semibold text-text-primary">${contract.amount.toFixed(2)}</p>
							</div>
							<div className="rounded-md border border-border bg-bg-soft p-4">
								<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Platform Fee</p>
								<p className="mt-1 text-lg font-semibold text-text-primary">{contract.platformFeePercent}%</p>
							</div>
						</div>
					</div>

					<div className="mt-6">
						<ContractActionPanel
							contract={contract}
							viewerRole={viewerRole}
							onUpdated={handleUpdated}
							onDispute={handleDispute}
						/>
					</div>

					<div className="mt-6">
						<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Transaction History</h2>
						<div className="mt-3">
							<ContractLedger transactions={transactions} />
						</div>
					</div>

					{contract.status === "completed" && (
						<div className="mt-6">
							<ContractReviewSection contractId={contract.id} />
						</div>
					)}
				</>
			)}
		</div>
	);
}
