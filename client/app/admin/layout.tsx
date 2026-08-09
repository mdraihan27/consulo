import { AdminGuard } from "../_components/AdminGuard";
import { AdminHeader } from "../_components/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<AdminGuard>
			<div className="flex min-h-dvh flex-col bg-bg">
				<AdminHeader />
				<main className="flex-1">
					<div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>
				</main>
			</div>
		</AdminGuard>
	);
}
