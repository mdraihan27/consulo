"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RaiseDisputeForm } from "../../../_components/RaiseDisputeForm";
import { Spinner } from "../../../_components/Spinner";
import type { Dispute } from "../../../_lib/api";

function NewDisputeContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const contractId = searchParams.get("contractId") || "";
	const [raised, setRaised] = useState<Dispute | null>(null);

	return (
		<div className="mx-auto w-full max-w-xl px-6 py-10">
			<div className="mb-6">
				<Link href={contractId ? `/dashboard/contracts/${contractId}` : "/dashboard/contracts"} className="text-xs font-medium text-text-muted hover:text-accent transition">
					← Back to Contract
				</Link>
			</div>

			{!contractId ? (
				<div className="rounded-lg border border-border bg-base p-5 text-sm text-accent">
					No contract specified.
				</div>
			) : raised ? (
				<div className="rounded-lg border border-border bg-base p-6 text-center">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Dispute Submitted</p>
					<h1 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
						An admin will review your evidence
					</h1>
					<p className="mt-3 text-sm text-text-body">
						This contract is now marked as disputed. You'll be notified once an admin resolves it.
					</p>
					<button
						type="button"
						onClick={() => router.push(`/dashboard/contracts/${contractId}`)}
						className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:opacity-95 cursor-pointer"
					>
						Back to Contract
					</button>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-base p-6">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Dispute Resolution</p>
					<h1 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
						Raise a dispute for this contract
					</h1>
					<p className="mt-2 text-sm text-text-body">
						Submit evidence that the work was completed. An admin will manually review it and decide whether to release funds to you or refund the client.
					</p>
					<div className="mt-6">
						<RaiseDisputeForm contractId={contractId} onRaised={setRaised} />
					</div>
				</div>
			)}
		</div>
	);
}

export default function NewDisputePage() {
	return (
		<Suspense
			fallback={
				<div className="flex flex-1 items-center justify-center py-20">
					<Spinner size="md" />
				</div>
			}
		>
			<NewDisputeContent />
		</Suspense>
	);
}
