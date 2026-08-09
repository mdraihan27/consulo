"use client";

import { FormEvent, useState } from "react";
import { replyToReview, type Review } from "../_lib/api";
import { Button } from "./Button";

export function ReviewReplyForm({ reviewId, onReplied }: { reviewId: string; onReplied: (review: Review) => void }) {
	const [reply, setReply] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!reply.trim()) return;
		setIsSubmitting(true);
		setError(null);
		try {
			const updated = await replyToReview(reviewId, reply.trim());
			onReplied(updated);
		} catch (err: any) {
			setError(String(err?.message || "Failed to reply"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
			<textarea
				value={reply}
				onChange={(e) => setReply(e.target.value)}
				rows={2}
				placeholder="Write a public reply..."
				className="w-full rounded-md border border-border-strong bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
			/>
			{error && <p className="text-xs text-accent">{error}</p>}
			<div>
				<Button type="submit" variant="secondary" disabled={isSubmitting || !reply.trim()}>
					{isSubmitting ? "Posting..." : "Post Reply"}
				</Button>
			</div>
		</form>
	);
}
