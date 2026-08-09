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
	onEnd
}: CallModalProps) {
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const remoteAudioRef = useRef<HTMLAudioElement>(null);

	useEffect(() => {
		if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
	}, [localStream]);

	useEffect(() => {
		if (callType === "video" && remoteVideoRef.current) {
			remoteVideoRef.current.srcObject = remoteStream;
		} else if (remoteAudioRef.current) {
			remoteAudioRef.current.srcObject = remoteStream;
		}
	}, [remoteStream, callType]);

	if (callState === "idle") return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/70 px-4">
			<div className="w-full max-w-lg rounded-2xl border border-border bg-base p-6 shadow-xl text-center">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
					{callType === "video" ? "Video Call" : "Voice Call"}
				</p>
				<h3 className="mt-2 text-lg font-semibold text-text-primary">{otherUserName}</h3>

				{error && <p className="mt-3 text-sm text-accent">{error}</p>}

				{callType === "video" && callState === "active" && (
					<div className="relative mt-4 rounded-xl overflow-hidden bg-bg-soft aspect-video">
						<video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
						<video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-24 h-16 rounded-lg object-cover border border-border" />
					</div>
				)}

				{callType === "voice" && <audio ref={remoteAudioRef} autoPlay />}

				<p className="mt-4 text-sm text-text-body">
					{callState === "calling" && "Calling..."}
					{callState === "ringing" && "Incoming call..."}
					{callState === "active" && "Connected"}
				</p>

				<div className="mt-6 flex items-center justify-center gap-3">
					{callState === "ringing" && (
						<>
							<button
								type="button"
								onClick={onAccept}
								className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 transition cursor-pointer"
							>
								Accept
							</button>
							<button
								type="button"
								onClick={onReject}
								className="rounded-xl border border-border-strong px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-soft transition cursor-pointer"
							>
								Decline
							</button>
						</>
					)}
					{(callState === "calling" || callState === "active") && (
						<button
							type="button"
							onClick={onEnd}
							className="rounded-xl border border-border-strong px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-soft transition cursor-pointer"
						>
							End Call
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
