"use client";

import { useState } from "react";
import { addFavorite, removeFavorite } from "../_lib/api";

type FavoriteButtonProps = {
	consultantId: string;
	initialFavorited: boolean;
	onToggled?: (isFavorited: boolean) => void;
};

export function FavoriteButton({ consultantId, initialFavorited, onToggled }: FavoriteButtonProps) {
	const [isFavorited, setIsFavorited] = useState(initialFavorited);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function toggle() {
		setIsSubmitting(true);
		try {
			if (isFavorited) {
				await removeFavorite(consultantId);
				setIsFavorited(false);
				onToggled?.(false);
			} else {
				await addFavorite(consultantId);
				setIsFavorited(true);
				onToggled?.(true);
			}
		} catch {
			return;
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<button
			type="button"
			onClick={toggle}
			disabled={isSubmitting}
			aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
			className="flex-shrink-0 rounded-md border border-border-strong p-2 text-text-primary hover:bg-bg-soft disabled:opacity-50 cursor-pointer transition"
		>
			<svg
				className={`w-4 h-4 ${isFavorited ? "text-accent" : "text-text-muted"}`}
				fill={isFavorited ? "currentColor" : "none"}
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
			</svg>
		</button>
	);
}
