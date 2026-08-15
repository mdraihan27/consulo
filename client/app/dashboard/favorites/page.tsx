"use client";

import { useEffect, useState } from "react";
import { getFavorites, type FavoriteConsultant } from "../../_lib/api";
import { Spinner } from "../../_components/Spinner";
import { FavoriteConsultantCard } from "../../_components/FavoriteConsultantCard";

export default function FavoritesPage() {
	const [favorites, setFavorites] = useState<FavoriteConsultant[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setFavorites(await getFavorites());
			} catch (e: any) {
				setError(String(e?.message || "Failed to load favorites"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Favorite Consultants</h1>
			<p className="mt-1 text-sm text-text-body">Quickly get back to consultants you've saved.</p>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-20">
						<Spinner size="md" />
					</div>
				) : error ? (
					<p className="text-sm text-accent">{error}</p>
				) : favorites.length === 0 ? (
					<div className="rounded-2xl border border-border bg-base p-12 text-center">
						<h3 className="text-base font-semibold text-text-primary">No favorites yet</h3>
						<p className="mt-2 text-sm text-text-body">
							Save consultants while searching to find them here later.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{favorites.map((favorite) => (
							<FavoriteConsultantCard key={favorite.favoriteId} favorite={favorite} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
