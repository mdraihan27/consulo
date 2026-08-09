"use client";

import { useEffect, useState } from "react";
import { getMyClientContracts, getMyConsultantContracts, type Contract } from "../../_lib/api";
import { useCurrentUser } from "../../_lib/useCurrentUser";
import { AppHeader } from "../../_components/AppHeader";
import { Spinner } from "../../_components/Spinner";
import { ContractCard } from "../../_components/ContractCard";
import Link from "next/link";

export default function ContractsPage() {
	const { user } = useCurrentUser();
	const [contracts, setContracts] = useState<Contract[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!user) return;
		(async () => {
			setIsLoading(true);
			try {
				const list = user.role === "freelancer" ? await getMyConsultantContracts() : await getMyClientContracts();
				setContracts(list);
			} catch (e: any) {
				setError(String(e?.message || "Failed to load contracts"));
			} finally {
				setIsLoading(false);
			}
		})();
	}, [user]);

	const viewerRole = user?.role === "freelancer" ? "freelancer" : "client";

	return (
		<div className="flex min-h-dvh flex-col bg-bg">
			<AppHeader
				subtitle="Contracts"
				showNotifications
				right={
					<Link href="/dashboard" className="rounded-md border border-border-strong px-3 py-2 font-medium text-text-primary hover:bg-bg-soft">
						← Dashboard
					</Link>
				}
			/>

			<main className="flex-1">
				<div className="mx-auto w-full max-w-5xl px-6 py-10">
					<h1 className="text-2xl font-bold tracking-tight text-text-primary">My Contracts</h1>
					<p className="mt-1 text-sm text-text-body">Track payment, progress, and completion for every contract.</p>

					<div className="mt-8">
						{isLoading ? (
							<div className="flex justify-center py-20">
								<Spinner size="md" />
							</div>
						) : error ? (
							<p className="text-sm text-accent">{error}</p>
						) : contracts.length === 0 ? (
							<div className="rounded-2xl border border-border bg-base p-12 text-center">
								<h3 className="text-base font-semibold text-text-primary">No contracts yet</h3>
								<p className="mt-2 text-sm text-text-body">
									Start a contract from an active conversation once you've agreed on scope.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{contracts.map((contract) => (
									<ContractCard key={contract.id} contract={contract} viewerRole={viewerRole} />
								))}
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
