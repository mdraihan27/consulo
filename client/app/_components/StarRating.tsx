type StarRatingProps = {
	value: number;
	onChange?: (value: number) => void;
	size?: "sm" | "md";
};

export function StarRating({ value, onChange, size = "sm" }: StarRatingProps) {
	const isInteractive = Boolean(onChange);
	const starClass = size === "md" ? "w-6 h-6" : "w-4 h-4";

	return (
		<div className="flex items-center gap-1">
			{[1, 2, 3, 4, 5].map((star) => (
				<button
					key={star}
					type="button"
					disabled={!isInteractive}
					onClick={() => onChange?.(star)}
					className={isInteractive ? "cursor-pointer" : "cursor-default"}
					aria-label={`${star} star`}
				>
					<svg
						className={`${starClass} ${star <= value ? "text-accent" : "text-border-strong"}`}
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
					</svg>
				</button>
			))}
		</div>
	);
}
