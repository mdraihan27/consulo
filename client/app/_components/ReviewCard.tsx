"use client";

import { useState } from "react";
import type { PublicReview, Review } from "../_lib/api";
import { Avatar } from "./Avatar";
import { StarRating } from "./StarRating";
import { ReviewReplyForm } from "./ReviewReplyForm";

type ReviewCardProps = {
	review: PublicReview;
	canReply?: boolean;
};

export function ReviewCard({ review, canReply = false }: ReviewCardProps) {
	const [current, setCurrent] = useState<Review>(review);
	const reviewerName = `${review.reviewerFirstName || ""} ${review.reviewerLastName || ""}`.trim() || review.reviewerUsername;

	return (
		<div className="rounded-lg border border-border bg-base p-5">
			<div className="flex items-start gap-3">
				<Avatar name={reviewerName} picture={review.reviewerProfilePicture} size="sm" />
				<div className="min-w-0 flex-1">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-semibold text-text-primary">{reviewerName}</p>
						<span className="text-xs text-text-muted">
							{new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
						</span>
					</div>
					<div className="mt-1">
						<StarRating value={review.rating} />
					</div>
					<p className="mt-2 text-sm leading-relaxed text-text-body">{review.comment}</p>

					{current.reply ? (
						<div className="mt-3 rounded-md border border-border bg-bg-soft p-3">
							<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Reply</p>
							<p className="mt-1 text-sm text-text-body">{current.reply}</p>
						</div>
					) : (
						canReply && <ReviewReplyForm reviewId={review.id} onReplied={setCurrent} />
					)}
				</div>
			</div>
		</div>
	);
}
