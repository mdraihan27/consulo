"use client";

import { useEffect, useRef } from "react";
import type { CallState } from "../_lib/useWebRTCCall";

type CallModalProps = {
	callState: CallState;
	callType: "voice" | "video";
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
	otherUserName: string;
	error: string | null;
	onAccept: () => void;
	onReject: () => void;
	onEnd: () => void;
	onDismiss: () => void;
};

export function CallModal({
	callState,
	callType,
	localStream,
	remoteStream,
	otherUserName,
	error,
	onAccept,
	onReject,
	onEnd,
	onDismiss
}: CallModalProps) {
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const remoteAudioRef = useRef<HTMLAudioElement>(null);

	const isActive = callState === "active";

	// callState is a dependency because the media elements mount and unmount with
	// the call: without it the stream would be handed to an element that does not
	// exist yet, and nothing would ever play.
	useEffect(() => {
		if (localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
			localVideoRef.current.srcObject = localStream;
		}
	}, [localStream, callState, callType]);

	useEffect(() => {
		if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
			remoteVideoRef.current.srcObject = remoteStream;
		}
		if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
			remoteAudioRef.current.srcObject = remoteStream;
		}
	}, [remoteStream, callState, callType]);

	// Autoplay can still be refused even with the attribute set; nudge it.
	useEffect(() => {
		if (!isActive) return;
		remoteVideoRef.current?.play().catch(() => {});
		remoteAudioRef.current?.play().catch(() => {});
	}, [isActive, remoteStream]);

	if (callState === "idle") return null;

	const hasFailed = callState === "failed";

	const statusLabel = hasFailed
		? "Call could not start"
		: callState === "calling"
		? "Ringing..."
		: callState === "ringing"
		? "Incoming call"
		: isActive
		? "Connected"
		: "";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/70 px-4">
			<div className="w-full max-w-lg rounded-2xl border border-border bg-base p-6 text-center shadow-xl">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
					{callType === "video" ? "Video Call" : "Voice Call"}
				</p>
				<h3 className="mt-2 text-lg font-semibold text-text-primary">{otherUserName}</h3>

				{error && (
					<p className="mt-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
				)}

				{hasFailed ? null : callType === "video" ? (
					<div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-bg-soft">
						<video
							ref={remoteVideoRef}
							autoPlay
							playsInline
							className={`h-full w-full object-cover ${isActive ? "" : "opacity-0"}`}
						/>

						{!isActive && (
							<div className="absolute inset-0 flex items-center justify-center">
								<p className="text-sm text-text-muted">{statusLabel}</p>
							</div>
						)}

						<video
							ref={localVideoRef}
							autoPlay
							playsInline
							muted
							className="absolute bottom-3 right-3 h-20 w-28 rounded-lg border border-border object-cover"
						/>
					</div>
				) : (
					<audio ref={remoteAudioRef} autoPlay />
				)}

				<p className="mt-4 text-sm text-text-body">{statusLabel}</p>

				<div className="mt-6 flex items-center justify-center gap-3">
					{hasFailed && (
						<button
							type="button"
							onClick={onDismiss}
							className="rounded-xl border border-border-strong px-6 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-bg-soft cursor-pointer"
						>
							Close
						</button>
					)}

					{callState === "ringing" && (
						<>
							<button
								type="button"
								onClick={onAccept}
								className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90 cursor-pointer"
							>
								Accept
							</button>
							<button
								type="button"
								onClick={onReject}
								className="rounded-xl border border-border-strong px-6 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-bg-soft cursor-pointer"
							>
								Decline
							</button>
						</>
					)}

					{callState !== "ringing" && !hasFailed && (
						<button
							type="button"
							onClick={onEnd}
							className="rounded-xl border border-border-strong px-6 py-2.5 text-sm font-semibold text-accent transition hover:bg-bg-soft cursor-pointer"
						>
							End Call
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
