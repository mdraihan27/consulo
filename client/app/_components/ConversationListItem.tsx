import Link from "next/link";
import type { InboxConversation } from "../_lib/api";
import { Avatar } from "./Avatar";

export function ConversationListItem({ conversation }: { conversation: InboxConversation }) {
	const name = `${conversation.otherFirstName || ""} ${conversation.otherLastName || ""}`.trim() || conversation.otherUsername;
	const preview = conversation.lastMessageType === "file" ? `📎 ${conversation.lastMessageContent}` : conversation.lastMessageContent;

	return (
		<Link
			href={`/dashboard/chat/${conversation.bookingId}`}
			className="flex items-center gap-4 rounded-xl border border-border bg-base p-4 hover:border-accent/50 transition"
		>
			<Avatar name={name} picture={conversation.otherProfilePicture} size="md" />
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm font-semibold text-text-primary truncate">{name}</p>
					{conversation.lastMessageAt && (
						<span className="text-xs text-text-muted flex-shrink-0">
							{new Date(conversation.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
						</span>
					)}
				</div>
				<p className="mt-1 text-sm text-text-body truncate">{preview || "No messages yet"}</p>
			</div>
			{conversation.unreadCount > 0 && (
				<span className="flex-shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-on-accent">
					{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
				</span>
			)}
		</Link>
	);
}
