import Link from "next/link";
import type { FreelancerSearchResult } from "../_lib/api";
import { Avatar } from "./Avatar";
import { RatingSummary } from "./RatingSummary";
import { FavoriteButton } from "./FavoriteButton";

type FreelancerCardProps = {
	freelancer: FreelancerSearchResult;
	isFavorited?: boolean;
	showFavoriteButton?: boolean;
};

export function FreelancerCard({ freelancer, isFavorited = false, showFavoriteButton = false }: FreelancerCardProps) {
	const name = `${freelancer.firstName} ${freelancer.lastName}`.trim();

	return (
		<div className="rounded-lg border border-border bg-base p-5 hover:border-accent transition">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<Avatar name={name} picture={freelancer.profilePicture} size="lg" />
					<div className="min-w-0">
						<p className="text-sm font-semibold text-text-primary truncate">{name}</p>
						<p className="text-xs text-text-muted truncate">@{freelancer.username}</p>
					</div>
				</div>
				{showFavoriteButton && <FavoriteButton consultantId={freelancer.id} initialFavorited={isFavorited} />}
			</div>

			<div className="mt-3">
				<RatingSummary averageRating={freelancer.averageRating} reviewCount={freelancer.reviewCount} />
			</div>

			<div className="mt-3">
				<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Expertise</p>
				<p className="mt-1 text-sm text-text-body font-medium">{freelancer.title}</p>
			</div>

			{freelancer.testScore !== null && freelancer.testScore !== undefined && (
				<div className="mt-3 flex items-center gap-2">
					<div className="flex-1 h-1.5 rounded-full bg-bg-soft overflow-hidden">
						<div className="h-full rounded-full bg-accent" style={{ width: `${freelancer.testScore}%` }} />
					</div>
					<span className="text-xs font-semibold text-text-primary">{freelancer.testScore}/100</span>
				</div>
			)}

			<Link
				href={`/dashboard/consultant/${freelancer.id}`}
				className="mt-4 block w-full rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent text-center hover:bg-accent hover:text-on-accent transition cursor-pointer"
			>
				View Profile & Book
			</Link>
		</div>
	);
}
