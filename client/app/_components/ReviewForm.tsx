"use client";

import { FormEvent, useState } from "react";
import { submitReview, type Review } from "../_lib/api";
import { Button } from "./Button";
import { StarRating } from "./StarRating";

type ReviewFormProps = {
	contractId: string;
	onSubmitted: (review: Review) => void;
};

export function ReviewForm({ contractId, onSubmitted }: ReviewFormProps) {
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (rating === 0 || !comment.trim()) {
			setError("Please select a rating and write a comment.");
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			const review = await submitReview(contractId, rating, comment.trim());
			onSubmitted(review);
		} catch (err: any) {
			setError(String(err?.message || "Failed to submit review"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div>
				<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Rating</label>
				<div className="mt-2">
					<StarRating value={rating} onChange={setRating} size="md" />
				</div>
			</div>
			<div>
				<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Your Review</label>
				<textarea
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					rows={4}
					placeholder="Share how the contract went."
					className="mt-1.5 w-full rounded-md border border-border-strong bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
				/>
			</div>
			{error && <p className="text-sm text-accent">{error}</p>}
			<div>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Submitting..." : "Submit Review"}
				</Button>
			</div>
		</form>
	);
}
