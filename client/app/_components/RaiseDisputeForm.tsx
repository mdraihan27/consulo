"use client";

import { FormEvent, useState } from "react";
import { raiseDispute, type Dispute } from "../_lib/api";
import { Button } from "./Button";

type RaiseDisputeFormProps = {
	contractId: string;
	onRaised: (dispute: Dispute) => void;
};

export function RaiseDisputeForm({ contractId, onRaised }: RaiseDisputeFormProps) {
	const [reason, setReason] = useState("");
	const [evidenceUrl, setEvidenceUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!reason.trim() || !evidenceUrl.trim()) {
			setError("Please describe the issue and provide an evidence link.");
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			const dispute = await raiseDispute(contractId, reason.trim(), evidenceUrl.trim());
			onRaised(dispute);
		} catch (err: any) {
			setError(String(err?.message || "Failed to raise dispute"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div>
				<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">What happened?</label>
				<textarea
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					rows={5}
					placeholder="Describe why the client has not confirmed completion of this contract."
					className="mt-1.5 w-full rounded-md border border-border-strong bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
				/>
			</div>
			<div>
				<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Evidence Link</label>
				<input
					type="url"
					value={evidenceUrl}
					onChange={(e) => setEvidenceUrl(e.target.value)}
					placeholder="https://drive.google.com/..."
					className="mt-1.5 w-full rounded-md border border-border-strong bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
				/>
				<p className="mt-1.5 text-xs text-text-muted">
					A Google Drive link (or any shareable link) containing evidence that the work was completed.
				</p>
			</div>

			{error && <p className="text-sm text-accent">{error}</p>}

			<div>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Submitting..." : "Submit Dispute"}
				</Button>
			</div>
		</form>
	);
}
