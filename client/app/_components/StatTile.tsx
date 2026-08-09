export function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
	return (
		<div className="rounded-lg border border-border bg-base p-5">
			<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
			<p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">{value}</p>
			{sublabel && <p className="mt-1 text-sm text-text-body">{sublabel}</p>}
		</div>
	);
}
