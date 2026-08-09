import { GoogleIcon } from "../_components/GoogleIcon";
import { AppHeader } from "../_components/AppHeader";

export default function LoginPage() {
	return (
		<div className="flex min-h-dvh flex-col bg-bg">
			<AppHeader />

			<main className="flex flex-1 items-center justify-center px-6 py-12">
				<div className="w-full max-w-md rounded-lg border border-border bg-base p-6">
					<h1 className="text-xl font-semibold tracking-tight text-text-primary">
						Login
					</h1>
					<p className="mt-1 text-sm text-text-muted">
						Continue with Google to book consultations.
					</p>

					<a
						href="/api/v1/auth/google"
						className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:opacity-95"
					>
						<GoogleIcon className="mr-2" />
						Continue with Google
					</a>
				</div>
			</main>
		</div>
	);
}
