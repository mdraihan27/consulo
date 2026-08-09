"use client";

import { useCallback, useRef, useState } from "react";
import type { CallSignalEvent, CallSignalType } from "./useChatSocket";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type CallState = "idle" | "calling" | "ringing" | "active" | "ended";

type UseWebRTCCallOptions = {
	sendCallSignal: (type: CallSignalType, callType?: "voice" | "video", payload?: any) => void;
};

export function useWebRTCCall({ sendCallSignal }: UseWebRTCCallOptions) {
	const [callState, setCallState] = useState<CallState>("idle");
	const [callType, setCallType] = useState<"voice" | "video">("voice");
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);

	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

	function createPeerConnection() {
		const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				sendCallSignal("ice_candidate", undefined, event.candidate);
			}
		};

		pc.ontrack = (event) => {
			setRemoteStream(event.streams[0]);
		};

		peerConnectionRef.current = pc;
		return pc;
	}

	async function getLocalMedia(type: "voice" | "video") {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: type === "video"
		});
		setLocalStream(stream);
		return stream;
	}

	async function startCall(type: "voice" | "video") {
		setError(null);
		setCallType(type);
		try {
			const stream = await getLocalMedia(type);
			const pc = createPeerConnection();
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			sendCallSignal("call_offer", type, offer);
			setCallState("calling");
		} catch (err: any) {
			setError(String(err?.message || "Could not access camera/microphone"));
			setCallState("idle");
		}
	}

	async function acceptCall(offer: RTCSessionDescriptionInit, type: "voice" | "video") {
		setError(null);
		setCallType(type);
		try {
			const stream = await getLocalMedia(type);
			const pc = createPeerConnection();
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			await pc.setRemoteDescription(new RTCSessionDescription(offer));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			sendCallSignal("call_answer", type, answer);
			setCallState("active");
		} catch (err: any) {
			setError(String(err?.message || "Could not access camera/microphone"));
			setCallState("idle");
		}
	}

	function rejectCall() {
		sendCallSignal("call_reject");
		setCallState("idle");
	}

	function endCall() {
		sendCallSignal("call_end");
		cleanup();
	}

	function cleanup() {
		peerConnectionRef.current?.close();
		peerConnectionRef.current = null;
		localStream?.getTracks().forEach((track) => track.stop());
		setLocalStream(null);
		setRemoteStream(null);
		setCallState("idle");
	}

	const handleCallSignal = useCallback(async (event: CallSignalEvent) => {
		if (event.type === "call_offer") {
			setCallType(event.callType || "voice");
			setCallState("ringing");
			peerConnectionRef.current = null;
			pendingOfferRef.current = event.payload;
			return;
		}

		if (event.type === "call_answer") {
			const pc = peerConnectionRef.current;
			if (pc) {
				await pc.setRemoteDescription(new RTCSessionDescription(event.payload));
				setCallState("active");
			}
			return;
		}

		if (event.type === "ice_candidate") {
			const pc = peerConnectionRef.current;
			if (pc && event.payload) {
				try {
					await pc.addIceCandidate(new RTCIceCandidate(event.payload));
				} catch {
					return;
				}
			}
			return;
		}

		if (event.type === "call_end" || event.type === "call_reject") {
			cleanup();
		}
	}, []);

	async function acceptPendingCall() {
		const offer = pendingOfferRef.current;
		if (!offer) return;
		await acceptCall(offer, callType);
	}

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
		handleCallSignal
	};
}
