import type { ContractTransaction } from "../_lib/api";

const TYPE_LABEL: Record<ContractTransaction["type"], string> = {
	payment: "Client Payment",
	release: "Released to Consultant",
	platform_fee: "Platform Fee (5%)",
	refund: "Refund to Client"
};

export function ContractLedger({ transactions }: { transactions: ContractTransaction[] }) {
	if (transactions.length === 0) {
		return <p className="text-sm text-text-body italic">No transactions yet.</p>;
	}

	return (
		<div className="divide-y divide-border rounded-md border border-border bg-base">
			{transactions.map((tx) => (
				<div key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
					<div>
						<p className="font-medium text-text-primary">{TYPE_LABEL[tx.type]}</p>
						<p className="mt-0.5 text-xs text-text-muted">
							{new Date(tx.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
						</p>
					</div>
					<span className="font-semibold text-text-primary">${tx.amount.toFixed(2)}</span>
				</div>
			))}
		</div>
	);
}
