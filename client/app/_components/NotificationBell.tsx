"use client";

import { useEffect, useRef, useState } from "react";
import {
	getNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	type AppNotification
} from "../_lib/api";
import { NotificationItem } from "./NotificationItem";

const POLL_INTERVAL_MS = 30000;

export function NotificationBell() {
	const [notifications, setNotifications] = useState<AppNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	async function load() {
		try {
			const data = await getNotifications();
			setNotifications(data.notifications);
			setUnreadCount(data.unreadCount);
		} catch {
			return;
		}
	}

	useEffect(() => {
		load();
		const interval = setInterval(load, POLL_INTERVAL_MS);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	async function handleRead(notificationId: string) {
		setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
		setUnreadCount((prev) => Math.max(0, prev - 1));
		try {
			await markNotificationRead(notificationId);
		} catch {
			return;
		}
	}

	async function handleMarkAllRead() {
		setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
		setUnreadCount(0);
		try {
			await markAllNotificationsRead();
		} catch {
			return;
		}
	}

	return (
		<div className="relative" ref={containerRef}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-label="Notifications"
				className="relative rounded-md border border-border-strong p-2 text-text-primary hover:bg-bg-soft cursor-pointer"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
				</svg>
				{unreadCount > 0 && (
					<span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-on-accent">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-base shadow-lg z-50">
					<div className="flex items-center justify-between px-4 py-3 border-b border-border">
						<p className="text-sm font-semibold text-text-primary">Notifications</p>
						{unreadCount > 0 && (
							<button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-accent hover:underline cursor-pointer">
								Mark all read
							</button>
						)}
					</div>
					{notifications.length === 0 ? (
						<p className="px-4 py-6 text-center text-sm text-text-body">No notifications yet.</p>
					) : (
						notifications.map((notification) => (
							<NotificationItem key={notification.id} notification={notification} onRead={handleRead} />
						))
					)}
				</div>
			)}
		</div>
	);
}
