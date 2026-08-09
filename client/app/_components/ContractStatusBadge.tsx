import type { ContractStatus } from "../_lib/api";
import { Badge } from "./Badge";

const STATUS_LABEL: Record<ContractStatus, string> = {
	pending_payment: "Awaiting Payment",
	funded: "Funded",
	in_progress: "In Progress",
	completion_requested: "Completion Requested",
	completed: "Completed",
	disputed: "Disputed",
	cancelled: "Cancelled"
};

const STATUS_TONE: Record<ContractStatus, "accent-strong" | "accent" | "neutral" | "muted"> = {
	pending_payment: "neutral",
	funded: "accent",
	in_progress: "accent",
	completion_requested: "accent",
	completed: "accent-strong",
	disputed: "muted",
	cancelled: "muted"
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
	return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
