"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getConsultantProfile, getMe, requestBooking, getPublicReviewsForUser, type ConsultantProfile, type PublicUser, type PublicReview } from "../../../_lib/api";
import { RatingSummary } from "../../../_components/RatingSummary";
import { ReviewCard } from "../../../_components/ReviewCard";

export default function ConsultantProfilePage() {
	const params = useParams();
	const router = useRouter();
	const consultantId = params?.id as string;

	const [profile, setProfile] = useState<ConsultantProfile | null>(null);
	const [me, setMe] = useState<PublicUser | null>(null);
	const [reviews, setReviews] = useState<PublicReview[]>([]);
	const [averageRating, setAverageRating] = useState<number | null>(null);
	const [reviewCount, setReviewCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Booking modal state
	const [showBookingModal, setShowBookingModal] = useState(false);
	const [bookingMessage, setBookingMessage] = useState("");
	const [isBooking, setIsBooking] = useState(false);
	const [bookingSuccess, setBookingSuccess] = useState(false);
	const [bookingError, setBookingError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setIsLoading(true);
			try {
				const [profileData, meData, reviewData] = await Promise.all([
					getConsultantProfile(consultantId),
					getMe(),
					getPublicReviewsForUser(consultantId)
				]);
				if (isMounted) {
					setProfile(profileData);
					setMe(meData);
					setReviews(reviewData.reviews);
					setAverageRating(reviewData.averageRating);
					setReviewCount(reviewData.reviewCount);
				}
			} catch (e: any) {
				if (isMounted) setError(e?.message || "Failed to load profile");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => { isMounted = false; };
	}, [consultantId]);

	async function handleBooking(e: React.FormEvent) {
		e.preventDefault();
		if (!bookingMessage.trim()) return;
		setIsBooking(true);
		setBookingError(null);
		try {
			await requestBooking(
				consultantId,
				bookingMessage.trim()
			);
			setBookingSuccess(true);
		} catch (err: any) {
			setBookingError(err?.message || "Failed to send booking request.");
		} finally {
			setIsBooking(false);
		}
	}

	if (isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-bg">
				<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center bg-bg gap-4 px-6">
				<p className="text-text-muted text-sm">{error || "Profile not found."}</p>
				<Link href="/dashboard" className="text-accent text-sm font-medium hover:underline">← Back to Dashboard</Link>
			</div>
		);
	}

	const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`;
	const scoreColor = "var(--accent)";

	return (
		<div className="flex min-h-dvh flex-col bg-bg">
			<header className="border-b border-border bg-base">
				<div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
					<div className="flex items-center gap-4">
						<Link href="/" className="inline-flex items-center">
							<img src="/assets/images/logo.svg" alt="Consulo" className="h-6 w-auto" />
						</Link>
						<span className="text-sm text-text-muted">Consultant Profile</span>
					</div>
					<Link href="/dashboard" className="rounded-md border border-border-strong px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-soft">
						← Back to Dashboard
					</Link>
				</div>
			</header>

			<main className="flex-1">
				<div className="mx-auto w-full max-w-4xl px-6 py-10">
					<div className="rounded-2xl border border-border bg-base overflow-hidden shadow-sm">
						<div className="h-32 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent relative" />

						<div className="px-8 pb-8">
							<div className="flex items-end justify-between -mt-12 mb-6">
								<div className="w-24 h-24 rounded-2xl border-4 border-base bg-bg-soft overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
									{profile.profilePicture ? (
										<img src={profile.profilePicture} alt={profile.firstName} className="w-full h-full object-cover" />
									) : (
										<span className="text-3xl font-bold text-text-muted">{initials}</span>
									)}
								</div>
								{me?.role === "client" && (
									<button
										type="button"
										onClick={() => { setShowBookingModal(true); setBookingSuccess(false); setBookingError(null); setBookingMessage(""); }}
										className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-on-accent hover:opacity-90 transition cursor-pointer shadow-sm"
										id="btn-request-consultation"
									>
										Request Consultation
									</button>
								)}
							</div>

							<div className="space-y-1">
								<h1 className="text-2xl font-bold tracking-tight text-text-primary">
									{profile.firstName} {profile.lastName}
								</h1>
								<p className="text-sm text-text-muted">@{profile.username}</p>
								<div className="mt-2">
									<RatingSummary averageRating={averageRating} reviewCount={reviewCount} />
								</div>
								{profile.title && (
									<span className="inline-flex items-center mt-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
										{profile.title}
									</span>
								)}
							</div>

							{profile.testScore !== null && profile.testScore !== undefined && (
								<div className="mt-6 flex items-center gap-4 p-4 rounded-xl bg-bg-soft border border-border">
									<div className="relative w-16 h-16 flex-shrink-0">
										<svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
											<circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
											<circle
												cx="18" cy="18" r="15.9" fill="none"
												stroke={scoreColor}
												strokeWidth="2.5"
												strokeDasharray={`${profile.testScore} ${100 - profile.testScore}`}
												strokeLinecap="round"
											/>
										</svg>
										<div className="absolute inset-0 flex items-center justify-center">
											<span className="text-sm font-bold text-text-primary">{profile.testScore}</span>
										</div>
									</div>
									<div>
										<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">AI Expertise Score</p>
										<p className="mt-0.5 text-sm font-medium text-text-body">Verified by our AI assessment engine</p>
										<p className="mt-1 text-xs text-text-muted">
											{profile.testScore >= 80 ? "Top-rated expert" : profile.testScore >= 60 ? "Proficient level" : "Developing expertise"}
										</p>
									</div>
								</div>
							)}

							{profile.bio && (
								<div className="mt-6">
									<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">About</h2>
									<p className="text-sm leading-7 text-text-body">{profile.bio}</p>
								</div>
							)}

							{profile.certifications && profile.certifications.length > 0 && (
								<div className="mt-6">
									<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">Certifications & Credentials</h2>
									<div className="grid gap-3 sm:grid-cols-2">
										{profile.certifications.map((cert: { id: string; name: string; url: string }) => (
											<a
												key={cert.id}
												href={cert.url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-3 rounded-xl border border-border bg-bg-soft px-4 py-3 hover:border-accent transition group"
											>
												<div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
													<svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
													</svg>
												</div>
												<span className="text-sm font-medium text-text-primary group-hover:text-accent transition truncate">{cert.name}</span>
											</a>
										))}
									</div>
								</div>
							)}

							<div className="mt-6">
								<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">
									Reviews {reviewCount > 0 ? `(${reviewCount})` : ""}
								</h2>
								{reviews.length === 0 ? (
									<p className="text-sm text-text-body italic">No reviews yet.</p>
								) : (
									<div className="space-y-3">
										{reviews.map((review) => (
											<ReviewCard key={review.id} review={review} canReply={me?.id === consultantId} />
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</main>

			{showBookingModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/60 px-4 backdrop-blur-sm">
					<div className="w-full max-w-lg rounded-2xl border border-border bg-base p-7 shadow-xl">
						{bookingSuccess ? (
							<div className="text-center py-4">
								<div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto">
									<svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<h3 className="mt-4 text-lg font-semibold text-text-primary">Request Sent!</h3>
								<p className="mt-2 text-sm text-text-body">
									Your consultation request has been sent to <strong>{profile.firstName}</strong>.{" "}
									You'll be notified once they respond.
								</p>
								<div className="mt-6 flex gap-3 justify-center">
									<button
										onClick={() => setShowBookingModal(false)}
										className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-soft transition cursor-pointer"
									>
										Close
									</button>
									<Link
										href="/dashboard/bookings"
										className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 transition"
									>
										View Bookings
									</Link>
								</div>
							</div>
						) : (
							<>
								<h3 className="text-lg font-semibold text-text-primary">Request a Consultation</h3>
								<p className="mt-1 text-sm text-text-body">
									Send a message to <strong>{profile.firstName} {profile.lastName}</strong> explaining what you need help with.
								</p>

								{bookingError && (
									<p className="mt-3 text-sm text-accent bg-bg-soft rounded-lg px-3 py-2">{bookingError}</p>
								)}

								<form onSubmit={handleBooking} className="mt-5 space-y-4">
									<div>
										<label htmlFor="booking-message" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
											Your Message
										</label>
										<textarea
											id="booking-message"
											value={bookingMessage}
											onChange={(e) => setBookingMessage(e.target.value)}
											placeholder="Hi, I need help with..."
											rows={5}
											required
											className="w-full rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
										/>
									</div>



									<div className="flex items-center justify-end gap-3 pt-1">
										<button
											type="button"
											onClick={() => setShowBookingModal(false)}
											disabled={isBooking}
											className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-soft disabled:opacity-50 transition cursor-pointer"
										>
											Cancel
										</button>
										<button
											type="submit"
											disabled={isBooking || !bookingMessage.trim()}
											id="btn-send-booking"
											className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
										>
											{isBooking ? "Sending..." : "Send Request"}
										</button>
									</div>
								</form>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
