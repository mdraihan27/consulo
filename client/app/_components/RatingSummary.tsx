import { StarRating } from "./StarRating";

export function RatingSummary({ averageRating, reviewCount }: { averageRating: number | null; reviewCount: number }) {
	if (!averageRating || reviewCount === 0) {
		return <p className="text-sm text-text-muted">No reviews yet</p>;
	}

	return (
		<div className="flex items-center gap-2">
			<StarRating value={Math.round(averageRating)} />
			<span className="text-sm font-semibold text-text-primary">{averageRating.toFixed(1)}</span>
			<span className="text-sm text-text-muted">
				({reviewCount} review{reviewCount === 1 ? "" : "s"})
			</span>
		</div>
	);
}
