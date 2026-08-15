"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { getAccessTokenFromCookies } from "../_lib/cookies";
import { CallSession, type CallState, type CallType } from "../_lib/webrtcSession";
import { useRingtone } from "../_lib/useRingtone";
import { CallModal } from "./CallModal";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

type CallContextValue = {
	startCall: (bookingId: string, type: CallType) => void;
	callState: CallState;
	isReady: boolean;
};

const CallContext = createContext<CallContextValue>({
	startCall: () => {},
	callState: "idle",
	isReady: false
});

export function useCall() {
	return useContext(CallContext);
}

/**
 * Owns call signalling for the whole dashboard.
 *
 * The socket used to live inside the chat page, which meant an incoming call
 * could only ring if the recipient already had that exact conversation open.
 * Mounting it at the layout keeps one connection alive across every page, so a
 * call reaches them wherever they are.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
	const router = useRouter();

	const [callState, setCallState] = useState<CallState>("idle");
	const [callType, setCallType] = useState<CallType>("voice");
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [peerName, setPeerName] = useState("");
	const [isReady, setIsReady] = useState(false);

	const socketRef = useRef<Socket | null>(null);
	// Which conversation the call in progress belongs to, so outgoing signals
	// are addressed correctly and Accept can jump to the right thread.
	const callBookingIdRef = useRef<string | null>(null);

	const session = useMemo(
		() =>
			new CallSession({
				sendSignal: (type, signalCallType, payload) => {
					const bookingId = callBookingIdRef.current;
					if (!bookingId) return;
					socketRef.current?.emit("call_signal", { bookingId, type, callType: signalCallType, payload });
				},
				onStateChange: setCallState,
				onCallTypeChange: setCallType,
				onLocalStream: setLocalStream,
				onRemoteStream: setRemoteStream,
				onError: setError
			}),
		[]
	);

	useEffect(() => {
		const token = getAccessTokenFromCookies();
		const socket = io(SOCKET_URL, {
			auth: token ? { token } : undefined,
			withCredentials: true,
			transports: ["websocket", "polling"]
		});
		socketRef.current = socket;

		socket.on("connect", () => setIsReady(true));
		socket.on("disconnect", () => setIsReady(false));

		socket.on("call_signal", (event: any) => {
			if (event?.type === "call_offer") {
				// Ignore a second caller while a call is already up; the session
				// declines it, but the banner must keep showing the current peer.
				if (session.getState() === "idle" || session.getState() === "failed") {
					callBookingIdRef.current = event.bookingId;
					setPeerName(event.fromName || "Consulo user");
				}
			}
			void session.handleSignal(event);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
			session.dispose();
		};
	}, [session]);

	const startCall = useCallback(
		(bookingId: string, type: CallType) => {
			callBookingIdRef.current = bookingId;
			void session.start(type);
		},
		[session]
	);

	const handleAccept = useCallback(() => {
		const bookingId = callBookingIdRef.current;
		void session.accept();
		// Answering from another page should land them in the conversation, so
		// chat and the shared history are right there during the call.
		if (bookingId) router.push(`/dashboard/chat/${bookingId}`);
	}, [router, session]);

	useRingtone(callState === "ringing" ? "incoming" : callState === "calling" ? "outgoing" : null);

	const value = useMemo<CallContextValue>(
		() => ({ startCall, callState, isReady }),
		[startCall, callState, isReady]
	);

	return (
		<CallContext.Provider value={value}>
			{children}
			<CallModal
				callState={callState}
				callType={callType}
				localStream={localStream}
				remoteStream={remoteStream}
				otherUserName={peerName || "Consulo user"}
				error={error}
				onAccept={handleAccept}
				onReject={() => session.reject()}
				onEnd={() => session.end()}
				onDismiss={() => session.close()}
			/>
		</CallContext.Provider>
	);
}
