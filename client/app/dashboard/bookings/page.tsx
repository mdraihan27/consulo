"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	getMe,
	getConsultantBookings,
	getClientBookings,
	respondToBooking,
	type PublicUser,
	type Booking,
} from "../../_lib/api";
import { Badge } from "../../_components/Badge";
import { Avatar } from "../../_components/Avatar";

const STATUS_LABEL: Record<string, string> = {
	pending: "Pending",
	accepted: "Accepted",
	declined: "Declined",
	completed: "Completed"
};

const STATUS_TONE: Record<string, "accent-strong" | "accent" | "neutral" | "muted"> = {
	pending: "neutral",
	accepted: "accent",
	declined: "muted",
	completed: "accent-strong"
};

function StatusBadge({ status }: { status: string }) {
	return <Badge tone={STATUS_TONE[status] || "neutral"}>{STATUS_LABEL[status] || status}</Badge>;
}

export default function BookingsPage() {
	const router = useRouter();
	const [me, setMe] = useState<PublicUser | null>(null);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [respondingId, setRespondingId] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setIsLoading(true);
			try {
				const user = await getMe();
				setMe(user);
				let bks: Booking[];
				if (user.role === "freelancer") {
					bks = await getConsultantBookings();
				} else if (user.role === "client") {
					bks = await getClientBookings();
				} else {
					bks = [];
				}
				setBookings(bks);
			} catch (e: any) {
				setError(e?.message || "Failed to load bookings");
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	async function handleRespond(bookingId: string, action: "accepted" | "declined") {
		setRespondingId(bookingId);
		try {
			const updated = await respondToBooking(bookingId, action);
			setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: updated.status } : b));
		} catch (e: any) {
			setError(e?.message || "Failed to respond to booking");
		} finally {
			setRespondingId(null);
		}
	}

	const pendingBookings = bookings.filter((b) => b.status === "pending");
	const activeBookings = bookings.filter((b) => b.status === "accepted");
	const pastBookings = bookings.filter((b) => ["declined", "completed"].includes(b.status));

	return (
		<div className="flex min-h-dvh flex-col bg-bg">
			<header className="border-b border-border bg-base">
				<div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
					<div className="flex items-center gap-4">
						<Link href="/" className="inline-flex items-center">
							<img src="/assets/images/logo.svg" alt="Consulo" className="h-6 w-auto" />
						</Link>
						<span className="text-sm text-text-muted">Bookings & Messages</span>
					</div>
					<Link href="/dashboard" className="rounded-md border border-border-strong px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-soft">
						← Dashboard
					</Link>
				</div>
			</header>

			<main className="flex-1">
				<div className="mx-auto w-full max-w-5xl px-6 py-10">
					<div className="mb-8">
						<h1 className="text-2xl font-bold tracking-tight text-text-primary">
							{me?.role === "freelancer" ? "Consultation Requests" : "My Bookings"}
						</h1>
						<p className="mt-1 text-sm text-text-body">
							{me?.role === "freelancer"
								? "Review and respond to incoming consultation requests from clients."
								: "Track your consultation requests and active conversations."}
						</p>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-20">
							<div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
						</div>
					) : error ? (
						<div className="rounded-xl border border-border bg-bg-soft p-4 text-sm text-accent">{error}</div>
					) : bookings.length === 0 ? (
						<div className="rounded-2xl border border-border bg-base p-12 text-center">
							<div className="w-16 h-16 rounded-2xl bg-bg-soft border border-border flex items-center justify-center mx-auto mb-4">
								<svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
								</svg>
							</div>
							<h3 className="text-base font-semibold text-text-primary">No bookings yet</h3>
							<p className="mt-2 text-sm text-text-body">
								{me?.role === "freelancer"
									? "When clients request consultations, they'll appear here."
									: "Search for consultants and send a consultation request to get started."}
							</p>
							{me?.role === "client" && (
								<Link href="/dashboard" className="mt-4 inline-flex items-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 transition">
									Find Consultants
								</Link>
							)}
						</div>
					) : (
						<div className="space-y-8">
							{pendingBookings.length > 0 && (
								<section>
									<h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
										<span className="w-2 h-2 rounded-full bg-border-strong" />
										Pending Requests
									</h2>
									<div className="space-y-3">
										{pendingBookings.map((booking) => (
											<BookingCard
												key={booking.id}
												booking={booking}
												role={me?.role || "client"}
												respondingId={respondingId}
												onRespond={handleRespond}
												onChat={() => router.push(`/dashboard/chat/${booking.id}`)}
											/>
										))}
									</div>
								</section>
							)}

							{activeBookings.length > 0 && (
								<section>
									<h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
										<span className="w-2 h-2 rounded-full bg-accent" />
										Active Conversations
									</h2>
									<div className="space-y-3">
										{activeBookings.map((booking) => (
											<BookingCard
												key={booking.id}
												booking={booking}
												role={me?.role || "client"}
												respondingId={respondingId}
												onRespond={handleRespond}
												onChat={() => router.push(`/dashboard/chat/${booking.id}`)}
											/>
										))}
									</div>
								</section>
							)}

							{pastBookings.length > 0 && (
								<section>
									<h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
										<span className="w-2 h-2 rounded-full bg-text-muted" />
										Past
									</h2>
									<div className="space-y-3">
										{pastBookings.map((booking) => (
											<BookingCard
												key={booking.id}
												booking={booking}
												role={me?.role || "client"}
												respondingId={respondingId}
												onRespond={handleRespond}
												onChat={() => router.push(`/dashboard/chat/${booking.id}`)}
											/>
										))}
									</div>
								</section>
							)}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

function BookingCard({
	booking,
	role,
	respondingId,
	onRespond,
	onChat,
}: {
	booking: Booking;
	role: string;
	respondingId: string | null;
	onRespond: (id: string, action: "accepted" | "declined") => void;
	onChat: () => void;
}) {
	const isConsultant = role === "freelancer";
	const otherName = isConsultant
		? `${booking.clientFirstName || ""} ${booking.clientLastName || ""}`.trim()
		: `${booking.consultantFirstName || ""} ${booking.consultantLastName || ""}`.trim();
	const otherPic = isConsultant ? booking.clientProfilePicture : booking.consultantProfilePicture;
	const otherUsername = isConsultant ? booking.clientUsername : booking.consultantUsername;
	const subtitle = !isConsultant && booking.consultantTitle ? booking.consultantTitle : "";
	const isResponding = respondingId === booking.id;

	return (
		<div className="rounded-xl border border-border bg-base p-5 hover:border-accent/50 transition group">
			<div className="flex items-start gap-4">
				<div className="flex-shrink-0">
					<div className="w-11 h-11 rounded-xl bg-bg-soft border border-border flex items-center justify-center overflow-hidden">
						{otherPic ? (
							<img src={otherPic} alt={otherName} className="w-full h-full object-cover" />
						) : (
							<span className="text-sm font-bold text-text-muted">{(otherName || "??").slice(0, 2).toUpperCase()}</span>
						)}
					</div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between gap-3 flex-wrap">
						<div>
							<p className="font-semibold text-text-primary text-sm">{otherName || "Unknown User"}</p>
							<p className="text-xs text-text-muted">
								{otherUsername ? `@${otherUsername}` : ""}
								{subtitle ? ` · ${subtitle}` : ""}
							</p>
						</div>
						<StatusBadge status={booking.status} />
					</div>

					<div className="mt-3 rounded-lg bg-bg-soft border border-border px-3 py-2.5">
						<p className="text-sm text-text-body leading-relaxed line-clamp-3">{booking.message}</p>
					</div>

					<div className="mt-3 flex items-center gap-3 flex-wrap">
						<span className="text-xs text-text-muted">
							{new Date(booking.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
						</span>

						{isConsultant && booking.status === "pending" && (
							<>
								<button
									onClick={onChat}
									id={`btn-chat-${booking.id}`}
									className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
								>
									<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
									</svg>
									View & Chat
								</button>
								<button
									onClick={() => onRespond(booking.id, "accepted")}
									disabled={isResponding}
									id={`btn-accept-${booking.id}`}
									className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
								>
									{isResponding ? "..." : "Accept"}
								</button>
								<button
									onClick={() => onRespond(booking.id, "declined")}
									disabled={isResponding}
									id={`btn-decline-${booking.id}`}
									className="rounded-lg border border-border-strong bg-bg-soft px-4 py-1.5 text-xs font-semibold text-text-muted hover:bg-border hover:text-text-primary disabled:opacity-50 transition cursor-pointer"
								>
									{isResponding ? "..." : "Decline"}
								</button>
							</>
						)}

						{!isConsultant && booking.status === "pending" && (
							<span className="text-xs text-text-muted font-medium flex items-center gap-1">
								<span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-pulse inline-block" />
								Awaiting consultant response
							</span>
						)}

						{booking.status === "accepted" && (
							<button
								onClick={onChat}
								id={`btn-chat-${booking.id}`}
								className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
							>
								<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
								</svg>
								Open Chat
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

