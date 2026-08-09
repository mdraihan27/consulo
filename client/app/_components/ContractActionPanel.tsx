"use client";

import { useState } from "react";
import {
	acceptContract,
	cancelContract,
	confirmContractCompletion,
	payForContract,
	requestContractCompletion,
	type Contract
} from "../_lib/api";
import { Button } from "./Button";

type ContractActionPanelProps = {
	contract: Contract;
	viewerRole: "client" | "freelancer";
	onUpdated: (contract: Contract) => void;
	onDispute: () => void;
};

export function ContractActionPanel({ contract, viewerRole, onUpdated, onDispute }: ContractActionPanelProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function runAction(action: () => Promise<Contract>) {
		setIsSubmitting(true);
		setError(null);
		try {
			const updated = await action();
			onUpdated(updated);
		} catch (err: any) {
			setError(String(err?.message || "Action failed"));
		} finally {
			setIsSubmitting(false);
		}
	}

	if (viewerRole === "client" && contract.status === "pending_payment") {
		return (
			<Panel error={error}>
				<p className="text-sm text-text-body">
					Pay ${contract.amount.toFixed(2)} to fund this contract. Funds are held until you confirm the work is complete.
				</p>
				<div className="mt-4 flex gap-3">
					<Button disabled={isSubmitting} onClick={() => runAction(() => payForContract(contract.id))}>
						{isSubmitting ? "Processing..." : `Pay $${contract.amount.toFixed(2)}`}
					</Button>
					<Button variant="secondary" disabled={isSubmitting} onClick={() => runAction(() => cancelContract(contract.id))}>
						Cancel
					</Button>
				</div>
			</Panel>
		);
	}

	if (viewerRole === "freelancer" && contract.status === "funded") {
		return (
			<Panel error={error}>
				<p className="text-sm text-text-body">
					This contract is funded with ${contract.amount.toFixed(2)} in escrow. Accept to begin work.
				</p>
				<div className="mt-4">
					<Button disabled={isSubmitting} onClick={() => runAction(() => acceptContract(contract.id))}>
						{isSubmitting ? "Processing..." : "Accept & Start Work"}
					</Button>
				</div>
			</Panel>
		);
	}

	if (viewerRole === "freelancer" && contract.status === "in_progress") {
		return (
			<Panel error={error}>
				<p className="text-sm text-text-body">Once the work is finished, request completion so the client can confirm.</p>
				<div className="mt-4">
					<Button disabled={isSubmitting} onClick={() => runAction(() => requestContractCompletion(contract.id))}>
						{isSubmitting ? "Processing..." : "Request Completion"}
					</Button>
				</div>
			</Panel>
		);
	}

	if (contract.status === "completion_requested") {
		if (viewerRole === "client") {
			const payoutAmount = contract.amount * (1 - contract.platformFeePercent / 100);
			return (
				<Panel error={error}>
					<p className="text-sm text-text-body">
						The consultant marked this contract as finished. Confirm to release ${payoutAmount.toFixed(2)} (after {contract.platformFeePercent}% platform fee).
					</p>
					<div className="mt-4">
						<Button disabled={isSubmitting} onClick={() => runAction(() => confirmContractCompletion(contract.id))}>
							{isSubmitting ? "Processing..." : "Confirm & Release Funds"}
						</Button>
					</div>
				</Panel>
			);
		}
		return (
			<Panel error={error}>
				<p className="text-sm text-text-body">
					Waiting for the client to confirm completion and release funds. If the client does not respond, you can raise a dispute for an admin to review.
				</p>
				<div className="mt-4">
					<Button variant="secondary" disabled={isSubmitting} onClick={onDispute}>
						Raise a Dispute
					</Button>
				</div>
			</Panel>
		);
	}

	return null;
}

function Panel({ children, error }: { children: React.ReactNode; error: string | null }) {
	return (
		<div className="rounded-lg border border-border bg-bg-soft p-5">
			{children}
			{error && <p className="mt-3 text-sm text-accent">{error}</p>}
		</div>
	);
}
