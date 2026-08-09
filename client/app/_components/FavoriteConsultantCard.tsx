"use client";

import Link from "next/link";
import { useState } from "react";
import type { FavoriteConsultant } from "../_lib/api";
import { Avatar } from "./Avatar";
import { FavoriteButton } from "./FavoriteButton";

export function FavoriteConsultantCard({ favorite }: { favorite: FavoriteConsultant }) {
	const [isRemoved, setIsRemoved] = useState(false);
	const name = `${favorite.firstName} ${favorite.lastName}`.trim();

	if (isRemoved) return null;

	return (
		<div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-base p-5">
			<Link href={`/dashboard/consultant/${favorite.id}`} className="flex items-center gap-3 min-w-0 flex-1">
				<Avatar name={name} picture={favorite.profilePicture} size="md" />
				<div className="min-w-0">
					<p className="text-sm font-semibold text-text-primary truncate">{name}</p>
					<p className="text-xs text-text-muted truncate">{favorite.title || `@${favorite.username}`}</p>
				</div>
			</Link>
			<FavoriteButton
				consultantId={favorite.id}
				initialFavorited={true}
				onToggled={(isFavorited) => setIsRemoved(!isFavorited)}
			/>
		</div>
	);
}
