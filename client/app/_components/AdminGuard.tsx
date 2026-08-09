"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../_lib/useCurrentUser";
import { Spinner } from "./Spinner";

export function AdminGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const { user, isLoading, error } = useCurrentUser();

	useEffect(() => {
		if (!isLoading && error) {
			router.replace("/login");
		}
	}, [isLoading, error, router]);

	if (isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-bg">
				<Spinner size="md" />
			</div>
		);
	}

	if (error) {
		return null;
	}

	if (user?.role !== "admin") {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
				<h1 className="text-xl font-semibold tracking-tight text-text-primary">Access restricted</h1>
				<p className="text-sm text-text-body">This area is only available to Consulo administrators.</p>
			</div>
		);
	}

	return <>{children}</>;
}
