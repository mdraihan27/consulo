import type { DisputeStatus } from "../_lib/api";
import { Badge } from "./Badge";

const STATUS_LABEL: Record<DisputeStatus, string> = {
	open: "Open",
	under_review: "Under Review",
	resolved_favor_client: "Resolved — Favor Client",
	resolved_favor_consultant: "Resolved — Favor Consultant"
};

const STATUS_TONE: Record<DisputeStatus, "accent-strong" | "accent" | "neutral"> = {
	open: "neutral",
	under_review: "accent",
	resolved_favor_client: "accent-strong",
	resolved_favor_consultant: "accent-strong"
};

export function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
	return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
