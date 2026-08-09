"use client";

import { useEffect, useState } from "react";
import { getContractReviews, type Review } from "../_lib/api";
import { ReviewForm } from "./ReviewForm";
import { StarRating } from "./StarRating";
import { Spinner } from "./Spinner";

export function ContractReviewSection({ contractId }: { contractId: string }) {
	const [myReview, setMyReview] = useState<Review | null>(null);
	const [theirReview, setTheirReview] = useState<Review | null>(null);
	const [isBlind, setIsBlind] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	async function load() {
		setIsLoading(true);
		try {
			const data = await getContractReviews(contractId);
			setMyReview(data.myReview);
			setTheirReview(data.theirReview);
			setIsBlind(data.isBlind);
		} catch (e: any) {
			setError(String(e?.message || "Failed to load reviews"));
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [contractId]);

	if (isLoading) {
		return (
			<div className="flex justify-center py-6">
				<Spinner />
			</div>
		);
	}

	if (error) {
		return <p className="text-sm text-accent">{error}</p>;
	}

	return (
		<div className="rounded-lg border border-border bg-base p-5">
			<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Leave a Review</h2>

			{!myReview ? (
				<div className="mt-4">
					<ReviewForm contractId={contractId} onSubmitted={(review) => { setMyReview(review); load(); }} />
				</div>
			) : (
				<div className="mt-4 rounded-md border border-border bg-bg-soft p-4">
					<StarRating value={myReview.rating} />
					<p className="mt-2 text-sm text-text-body">{myReview.comment}</p>
				</div>
			)}

			{myReview && isBlind && !theirReview && (
				<p className="mt-3 text-xs text-text-muted">
					The other party's review will appear here once they submit theirs.
				</p>
			)}

			{theirReview && (
				<div className="mt-4">
					<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Their Review of You</p>
					<div className="mt-2 rounded-md border border-border bg-bg-soft p-4">
						<StarRating value={theirReview.rating} />
						<p className="mt-2 text-sm text-text-body">{theirReview.comment}</p>
					</div>
				</div>
			)}
		</div>
	);
}
