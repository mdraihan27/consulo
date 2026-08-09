import Link from "next/link";
import type { AppNotification } from "../_lib/api";

export function NotificationItem({ notification, onRead }: { notification: AppNotification; onRead: (id: string) => void }) {
	const content = (
		<div
			className={`px-4 py-3 border-b border-border last:border-b-0 ${notification.isRead ? "bg-base" : "bg-accent/5"}`}
		>
			<p className="text-sm font-semibold text-text-primary">{notification.title}</p>
			<p className="mt-1 text-xs text-text-body">{notification.body}</p>
			<p className="mt-1 text-xs text-text-muted">
				{new Date(notification.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
			</p>
		</div>
	);

	if (!notification.link) {
		return (
			<button type="button" onClick={() => onRead(notification.id)} className="w-full text-left cursor-pointer">
				{content}
			</button>
		);
	}

	return (
		<Link href={notification.link} onClick={() => onRead(notification.id)} className="block">
			{content}
		</Link>
	);
}
