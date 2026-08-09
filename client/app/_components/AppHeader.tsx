import Link from "next/link";
import { ReactNode } from "react";
import { NotificationBell } from "./NotificationBell";

type AppHeaderProps = {
	subtitle?: string;
	right?: ReactNode;
	showNotifications?: boolean;
};

export function AppHeader({ subtitle, right, showNotifications = false }: AppHeaderProps) {
	return (
		<header className="border-b border-border bg-base">
			<div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
				<div className="flex items-center gap-4">
					<Link href="/" className="inline-flex items-center">
						<img src="/assets/images/logo.svg" alt="Consulo" className="h-6 w-auto" />
					</Link>
					{subtitle && <span className="text-sm text-text-muted">{subtitle}</span>}
				</div>
				<nav className="flex items-center gap-3 text-sm">
					{showNotifications && <NotificationBell />}
					{right}
				</nav>
			</div>
		</header>
	);
}
