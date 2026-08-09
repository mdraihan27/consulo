"use client";

import { FormEvent, useState } from "react";
import { createContract, type Contract } from "../_lib/api";
import { Button } from "./Button";

type CreateContractModalProps = {
	bookingId: string;
	onClose: () => void;
	onCreated: (contract: Contract) => void;
};

export function CreateContractModal({ bookingId, onClose, onCreated }: CreateContractModalProps) {
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const numericAmount = Number(amount);
		if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
			setError("Please provide a title and a positive amount.");
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			const contract = await createContract(bookingId, title.trim(), numericAmount);
			onCreated(contract);
		} catch (err: any) {
			setError(String(err?.message || "Failed to create contract"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/50 px-4">
			<div className="w-full max-w-md rounded-lg border border-border bg-base p-6 shadow-lg">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Start a Contract</p>
				<h3 className="mt-2 text-lg font-semibold tracking-tight text-text-primary">Define the scope and amount</h3>
				<p className="mt-2 text-sm text-text-body">
					Payment is simulated for this platform. Funds are held until you confirm the work is complete, minus a 5% platform fee.
				</p>

				<form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
					<div>
						<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Contract Title</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Q3 marketing strategy review"
							className="mt-1.5 w-full rounded-md border border-border-strong bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Amount (USD)</label>
						<input
							type="number"
							min="1"
							step="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="500"
							className="mt-1.5 w-full rounded-md border border-border-strong bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
					</div>

					{error && <p className="text-sm text-accent">{error}</p>}

					<div className="mt-2 flex items-center justify-end gap-3">
						<Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Contract"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
