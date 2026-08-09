import { ReactNode } from "react";

type BadgeTone = "neutral" | "accent" | "accent-strong" | "muted";

type BadgeProps = {
	children: ReactNode;
	tone?: BadgeTone;
};

const TONE_CLASSES: Record<BadgeTone, string> = {
	neutral: "bg-bg-soft text-text-body border-border",
	accent: "bg-accent/10 text-accent border-accent/30",
	"accent-strong": "bg-accent text-on-accent border-accent",
	muted: "bg-bg-muted text-text-muted border-border"
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
	return (
		<span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
			{children}
		</span>
	);
}
