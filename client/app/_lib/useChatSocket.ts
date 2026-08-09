"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getAccessTokenFromCookies } from "./cookies";
import type { ChatMessage } from "./api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export type CallSignalType = "call_offer" | "call_answer" | "ice_candidate" | "call_end" | "call_reject";

export type CallSignalEvent = {
	bookingId: string;
	type: CallSignalType;
	callType?: "voice" | "video";
	payload?: any;
	fromUserId: string;
};

type UseChatSocketOptions = {
	bookingId: string;
	onNewMessage: (message: ChatMessage) => void;
	onBookingUpdated: (status: string) => void;
	onTypingUpdate: (userId: string, isTyping: boolean) => void;
	onReadReceipt: (userId: string, readAt: string) => void;
	onCallSignal: (event: CallSignalEvent) => void;
	onError: (message: string) => void;
	onPresenceUpdate?: (userId: string | null, isOnline: boolean) => void;
};

export function useChatSocket({
	bookingId,
	onNewMessage,
	onBookingUpdated,
	onTypingUpdate,
	onReadReceipt,
	onCallSignal,
	onError,
	onPresenceUpdate
}: UseChatSocketOptions) {
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<Socket | null>(null);
	const callbacksRef = useRef({ onNewMessage, onBookingUpdated, onTypingUpdate, onReadReceipt, onCallSignal, onError, onPresenceUpdate });
	callbacksRef.current = { onNewMessage, onBookingUpdated, onTypingUpdate, onReadReceipt, onCallSignal, onError, onPresenceUpdate };

	useEffect(() => {
		if (!bookingId) return;

		const token = getAccessTokenFromCookies();
		const socket = io(SOCKET_URL, {
			auth: token ? { token } : undefined,
			withCredentials: true,
			transports: ["websocket", "polling"]
		});
		socketRef.current = socket;

		socket.on("connect", () => {
			setIsConnected(true);
			socket.emit("join_booking", { bookingId });
		});

		socket.on("disconnect", () => setIsConnected(false));
		socket.on("joined", (data: { bookingId: string; otherUserOnline: boolean }) => callbacksRef.current.onPresenceUpdate?.(null, data.otherUserOnline));
		socket.on("presence_update", (data: { userId: string; isOnline: boolean }) => callbacksRef.current.onPresenceUpdate?.(data.userId, data.isOnline));
		socket.on("new_message", (msg: ChatMessage) => callbacksRef.current.onNewMessage(msg));
		socket.on("booking_updated", (data: { status: string }) => callbacksRef.current.onBookingUpdated(data.status));
		socket.on("typing_update", (data: { userId: string; isTyping: boolean }) => callbacksRef.current.onTypingUpdate(data.userId, data.isTyping));
		socket.on("read_receipt", (data: { userId: string; readAt: string }) => callbacksRef.current.onReadReceipt(data.userId, data.readAt));
		socket.on("call_signal", (data: CallSignalEvent) => callbacksRef.current.onCallSignal(data));
		socket.on("error", (data: { message: string }) => callbacksRef.current.onError(data.message));

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [bookingId]);

	function sendMessage(content: string) {
		socketRef.current?.emit("send_message", { bookingId, content });
	}

	function sendFile(fileBase64: string, fileName: string) {
		socketRef.current?.emit("send_file", { bookingId, fileBase64, fileName });
	}

	function sendTyping(isTyping: boolean) {
		socketRef.current?.emit("typing", { bookingId, isTyping });
	}

	function markRead() {
		socketRef.current?.emit("mark_read", { bookingId });
	}

	function sendCallSignal(type: CallSignalType, callType?: "voice" | "video", payload?: any) {
		socketRef.current?.emit("call_signal", { bookingId, type, callType, payload });
	}

	return { isConnected, sendMessage, sendFile, sendTyping, markRead, sendCallSignal };
}
