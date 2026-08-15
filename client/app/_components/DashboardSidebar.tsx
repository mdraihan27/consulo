"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardSidebarProps = {
	userRole?: string | null;
	userName?: string;
	userPicture?: string | null;
	pendingBookingCount?: number;
	unreadMessagesCount?: number;
	isOpen: boolean;
	onClose: () => void;
	onLogout: () => void;
};

const NAV_ITEMS = [
	{
		href: "/dashboard",
		label: "Dashboard",
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			</svg>
		),
		exact: true,
		roles: ["freelancer", "client"],
	},
	{
		href: "/dashboard/inbox",
		label: "Inbox",
		badgeKey: "unreadMessagesCount" as const,
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
			</svg>
		),
		roles: ["freelancer", "client"],
	},
	{
		href: "/dashboard/bookings",
		label: "Bookings",
		badgeKey: "pendingBookingCount" as const,
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
		),
		roles: ["freelancer", "client"],
	},
	{
		href: "/dashboard/contracts",
		label: "Contracts",
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
		),
		roles: ["freelancer", "client"],
	},
	{
		href: "/dashboard/favorites",
		label: "Favorites",
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
			</svg>
		),
		roles: ["client"],
	},
	{
		href: "/dashboard/profile",
		label: "Profile",
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
			</svg>
		),
		roles: ["freelancer", "client"],
	},
];

export function DashboardSidebar({
	userRole,
	userName,
	userPicture,
	pendingBookingCount = 0,
	unreadMessagesCount = 0,
	isOpen,
	onClose,
	onLogout,
}: DashboardSidebarProps) {
	const pathname = usePathname();

	function isActive(href: string, exact?: boolean) {
		if (exact) return pathname === href;
		return pathname === href || pathname.startsWith(href + "/");
	}

	const visibleItems = NAV_ITEMS.filter(
		(item) => userRole && item.roles.includes(userRole)
	);

	const initials = userName
		? userName
				.split(" ")
				.map((w) => w[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	return (
		<>
			{/* Mobile overlay */}
			<div
				className={`sidebar-overlay ${isOpen ? "open" : ""}`}
				onClick={onClose}
			/>

			{/* Sidebar panel */}
			<aside
				className={`sidebar-panel ${isOpen ? "open" : ""} w-[var(--sidebar-width)] bg-sidebar-bg border-r border-border flex flex-col md:relative md:translate-x-0 md:sticky md:top-0 md:h-dvh md:self-start shrink-0 overflow-y-auto`}
			>
				{/* Logo */}
				<div className="flex items-center justify-between px-5 py-5 border-b border-border">
					<Link href="/" className="inline-flex items-center">
						<img
							src="/assets/images/logo.svg"
							alt="Consulo"
							className="h-6 w-auto"
						/>
					</Link>
					{/* Close button on mobile */}
					<button
						type="button"
						className="md:hidden p-1 rounded-md hover:bg-sidebar-hover text-text-muted cursor-pointer"
						onClick={onClose}
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* User info */}
				{userName && (
					<div className="px-5 py-4 border-b border-border">
						<div className="flex items-center gap-3">
							{userPicture ? (
								<img
									src={userPicture}
									alt={userName}
									className="w-9 h-9 rounded-full object-cover border border-border"
								/>
							) : (
								<div className="w-9 h-9 rounded-full bg-bg-muted border border-border flex items-center justify-center text-xs font-semibold text-text-primary">
									{initials}
								</div>
							)}
							<div className="min-w-0">
								<p className="text-sm font-semibold text-text-primary truncate">
									{userName}
								</p>
								<p className="text-xs text-text-muted capitalize">
									{userRole === "freelancer" ? "Consultant" : userRole || "User"}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Navigation */}
				<nav className="flex-1 overflow-y-auto px-3 py-4">
					<ul className="space-y-1">
						{visibleItems.map((item) => {
							const active = isActive(item.href, item.exact);
							const badgeCount =
								item.badgeKey === "pendingBookingCount"
									? pendingBookingCount
									: item.badgeKey === "unreadMessagesCount"
									? unreadMessagesCount
									: 0;

							return (
								<li key={item.href}>
									<Link
										href={item.href}
										onClick={onClose}
										className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
											active ? "active" : "text-text-body"
										}`}
									>
										<span className={active ? "text-accent" : "text-text-muted"}>
											{item.icon}
										</span>
										<span className="flex-1">{item.label}</span>
										{badgeCount > 0 && (
											<span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-on-accent">
												{badgeCount > 9 ? "9+" : badgeCount}
											</span>
										)}
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>

				{/* Logout */}
				<div className="border-t border-border px-3 py-4">
					<button
						type="button"
						onClick={onLogout}
						className="sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-body cursor-pointer"
					>
						<svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						<span>Log out</span>
					</button>
				</div>
			</aside>
		</>
	);
}
