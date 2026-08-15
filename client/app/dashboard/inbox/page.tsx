"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getInbox, type InboxConversation } from "../../_lib/api";
import { Spinner } from "../../_components/Spinner";
import { ConversationListItem } from "../../_components/ConversationListItem";

export default function InboxPage() {
	const [conversations, setConversations] = useState<InboxConversation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				setConversations(await getInbox());
			} catch (e: any) {
				setError(String(e?.message || "Failed to load inbox"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<h1 className="text-2xl font-bold tracking-tight text-text-primary">Inbox</h1>
			<p className="mt-1 text-sm text-text-body">All your conversations in one place.</p>

			<div className="mt-8">
				{isLoading ? (
					<div className="flex justify-center py-20">
						<Spinner size="md" />
					</div>
				) : error ? (
					<p className="text-sm text-accent">{error}</p>
				) : conversations.length === 0 ? (
					<div className="rounded-2xl border border-border bg-base p-12 text-center">
						<h3 className="text-base font-semibold text-text-primary">No conversations yet</h3>
						<p className="mt-2 text-sm text-text-body">Once a booking is accepted, your conversation will appear here.</p>
					</div>
				) : (
					<div className="space-y-3">
						{conversations.map((conversation) => (
							<ConversationListItem key={conversation.bookingId} conversation={conversation} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

