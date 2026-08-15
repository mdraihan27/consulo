"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getMe, logout, getConsultantBookings, getInbox, type PublicUser } from "../_lib/api";
import { DashboardSidebar } from "../_components/DashboardSidebar";
import { NotificationBell } from "../_components/NotificationBell";
import { CallProvider } from "../_components/CallProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const [user, setUser] = useState<PublicUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [pendingBookingCount, setPendingBookingCount] = useState(0);
	const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

	async function refreshBadges(currentUser: PublicUser) {
		try {
			const inbox = await getInbox();
			const totalUnread = inbox.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
			setUnreadMessagesCount(totalUnread);
		} catch { /* non-critical */ }

		if (currentUser.role === "freelancer") {
			try {
				const bookings = await getConsultantBookings();
				const pending = bookings.filter((b) => b.status === "pending").length;
				setPendingBookingCount(pending);
			} catch { /* non-critical */ }
		}
	}

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const me = await getMe();
				if (!isMounted) return;
				if (me.role === "admin") {
					router.replace("/admin");
					return;
				}
				setUser(me);
				if (me.role && me.role !== "user") {
					await refreshBadges(me);
				}
			} catch {
				// Not authenticated — each page will handle this
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => { isMounted = false; };
	}, [router]);

	// Refresh badge counts on route change and on periodic interval (15s)
	useEffect(() => {
		if (!user || !user.role || user.role === "user") return;
		refreshBadges(user);
		const interval = setInterval(() => {
			refreshBadges(user);
		}, 15000);
		return () => clearInterval(interval);
	}, [pathname, user]);

	async function handleLogout() {
		await logout();
		router.push("/login");
	}

	const userName = user
		? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
		: undefined;

	// Show sidebar only for users with a set role
	const showSidebar = !isLoading && user && user.role && user.role !== "user";

	// Calls only make sense once we know who they are, and the socket needs a
	// session anyway, so the provider waits for the user to load.
	const content = (
		<div className="flex min-h-dvh bg-bg">
			{showSidebar && (
				<DashboardSidebar
					userRole={user.role}
					userName={userName}
					userPicture={user.profilePicture || null}
					pendingBookingCount={pendingBookingCount}
					unreadMessagesCount={unreadMessagesCount}
					isOpen={sidebarOpen}
					onClose={() => setSidebarOpen(false)}
					onLogout={handleLogout}
				/>
			)}

			<div className="flex flex-1 flex-col min-w-0">
				{/* Top bar */}
				{showSidebar && (
					<header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-base px-4 py-3 md:px-6">
						{/* Mobile hamburger */}
						<button
							type="button"
							className="md:hidden p-2 rounded-lg hover:bg-bg-soft text-text-primary cursor-pointer"
							onClick={() => setSidebarOpen(true)}
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>

						{/* Page context — hidden on mobile, visible on desktop */}
						<div className="hidden md:block" />

						{/* Right side — notifications */}
						<div className="flex items-center gap-3 ml-auto">
							<NotificationBell />
						</div>
					</header>
				)}

				{/* Main content */}
				<main className="flex-1">
					{children}
				</main>
			</div>
		</div>
	);

	if (!user || !user.role || user.role === "user") return content;

	return <CallProvider>{content}</CallProvider>;
}
