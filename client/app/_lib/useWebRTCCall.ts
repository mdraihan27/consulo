"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CallSession, type CallState, type CallType } from "./webrtcSession";
import type { CallSignalEvent, CallSignalType } from "./useChatSocket";

export type { CallState } from "./webrtcSession";

type UseWebRTCCallOptions = {
	sendCallSignal: (type: CallSignalType, callType?: CallType, payload?: any) => void;
};

export function useWebRTCCall({ sendCallSignal }: UseWebRTCCallOptions) {
	const [callState, setCallState] = useState<CallState>("idle");
	const [callType, setCallType] = useState<CallType>("voice");
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);

	const sendSignalRef = useRef(sendCallSignal);
	sendSignalRef.current = sendCallSignal;

	// One session for the lifetime of the chat page. Signalling goes through a
	// ref so a re-rendered socket callback never rebuilds the connection.
	const session = useMemo(
		() =>
			new CallSession({
				sendSignal: (type, type2, payload) => sendSignalRef.current(type, type2, payload),
				onStateChange: setCallState,
				onCallTypeChange: setCallType,
				onLocalStream: setLocalStream,
				onRemoteStream: setRemoteStream,
				onError: setError
			}),
		[]
	);

	// Never leave the camera running if the page unmounts mid call.
	useEffect(() => () => session.dispose(), [session]);

	const startCall = useCallback((type: CallType) => session.start(type), [session]);
	const acceptPendingCall = useCallback(() => session.accept(), [session]);
	const rejectCall = useCallback(() => session.reject(), [session]);
	const endCall = useCallback(() => session.end(), [session]);
	const dismissCall = useCallback(() => session.close(), [session]);

	const handleCallSignal = useCallback(
		(event: CallSignalEvent) => session.handleSignal(event),
		[session]
	);

	return {
		callState,
		callType,
		localStream,
		remoteStream,
		error,
		startCall,
		acceptPendingCall,
		rejectCall,
		endCall,
		dismissCall,
		handleCallSignal
	};
}
