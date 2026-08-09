"use client";

import { FormEvent, useState } from "react";
import { resolveDispute, type Dispute } from "../_lib/api";
import { Button } from "./Button";

type ResolveDisputeFormProps = {
	disputeId: string;
	onResolved: (dispute: Dispute) => void;
};

export function ResolveDisputeForm({ disputeId, onResolved }: ResolveDisputeFormProps) {
	const [outcome, setOutcome] = useState<"favor_consultant" | "favor_client">("favor_consultant");
	const [notes, setNotes] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!notes.trim()) {
			setError("Resolution notes are required.");
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			const dispute = await resolveDispute(disputeId, outcome, notes.trim());
			onResolved(dispute);
		} catch (err: any) {
			setError(String(err?.message || "Failed to resolve dispute"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div>
				<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Decision</label>
				<div className="mt-2 flex gap-2">
					<button
						type="button"
						onClick={() => setOutcome("favor_consultant")}
						className={`rounded-md px-3 py-2 text-xs font-medium transition cursor-pointer ${
							outcome === "favor_consultant" ? "bg-accent text-on-accent" : "bg-bg-soft text-text-primary hover:bg-border"
						}`}
					>
						Release Funds to Consultant
					</button>
					<button
						type="button"
						onClick={() => setOutcome("favor_client")}
						className={`rounded-md px-3 py-2 text-xs font-medium transition cursor-pointer ${
							outcome === "favor_client" ? "bg-accent text-on-accent" : "bg-bg-soft text-text-primary hover:bg-border"
						}`}
					>
						Refund Client
					</button>
				</div>
			</div>

			<div>
				<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Resolution Notes</label>
				<textarea
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={4}
					placeholder="Explain the basis for this decision."
					className="mt-1.5 w-full rounded-md border border-border-strong bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
				/>
			</div>

			{error && <p className="text-sm text-accent">{error}</p>}

			<div>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Resolving..." : "Resolve Dispute"}
				</Button>
			</div>
		</form>
	);
}
