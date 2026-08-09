"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, getChatHistory, markBookingRead, getSessionsForBooking, type PublicUser, type ChatMessage, type Contract, type ConsultationSession } from "../../../_lib/api";
import { formatRelative, formatSessionDate, formatSessionTime, isSessionUpcoming } from "../../../_lib/schedule";
import { ScheduleSessionModal } from "../../../_components/ScheduleSessionModal";
import { useChatSocket } from "../../../_lib/useChatSocket";
import { useWebRTCCall } from "../../../_lib/useWebRTCCall";
import { CreateContractModal } from "../../../_components/CreateContractModal";
import { ChatHeader } from "../../../_components/ChatHeader";
import { MessageBubble } from "../../../_components/MessageBubble";
import { TypingIndicator } from "../../../_components/TypingIndicator";
import { CallModal } from "../../../_components/CallModal";
import { Spinner } from "../../../_components/Spinner";

function formatDate(dateStr: string) {
	const d = new Date(dateStr);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (d.toDateString() === today.toDateString()) return "Today";
	if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
	return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

const TYPING_STOP_DELAY_MS = 2000;

export default function ChatPage() {
	const params = useParams();
	const router = useRouter();
	const bookingId = params?.bookingId as string;

	const [me, setMe] = useState<PublicUser | null>(null);
	const [booking, setBooking] = useState<any>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [otherUserName, setOtherUserName] = useState("");
	const [otherUserPic, setOtherUserPic] = useState<string | undefined>();
	const [showCreateContract, setShowCreateContract] = useState(false);
	const [isOtherTyping, setIsOtherTyping] = useState(false);
	const [isOtherOnline, setIsOtherOnline] = useState(false);
	const [isUploadingFile, setIsUploadingFile] = useState(false);
	const [sessions, setSessions] = useState<ConsultationSession[]>([]);
	const [showScheduleSession, setShowScheduleSession] = useState(false);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setIsLoading(true);
			try {
				const [userData, chatData, sessionData] = await Promise.all([
					getMe(),
					getChatHistory(bookingId),
					getSessionsForBooking(bookingId).catch(() => [] as ConsultationSession[])
				]);
				if (!isMounted) return;
				setMe(userData);
				setBooking(chatData.booking);
				setMessages(chatData.messages);
				setSessions(sessionData);
				setOtherUserName(userData.role === "freelancer" ? "Client" : "Consultant");
			} catch (e: any) {
				if (isMounted) setError(e?.message || "Failed to load chat");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [bookingId]);

	useEffect(() => {
		if (!me || messages.length === 0) return;
		const otherMsg = messages.find((m) => m.senderId !== me.id);
		if (otherMsg) {
			setOtherUserName(`${otherMsg.firstName || ""} ${otherMsg.lastName || ""}`.trim() || otherMsg.username || "");
			setOtherUserPic(otherMsg.profilePicture);
		}
	}, [messages, me]);

	const otherUserId: string | undefined = me && booking ? (booking.client_id === me.id ? booking.consultant_id : booking.client_id) : undefined;

	const { isConnected, sendMessage, sendFile, sendTyping, markRead, sendCallSignal } = useChatSocket({
		bookingId,
		onNewMessage: (msg) => {
			setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
			if (me && msg.senderId !== me.id) {
				markRead();
			}
		},
		onBookingUpdated: (status) => setBooking((prev: any) => ({ ...prev, status })),
		onTypingUpdate: (userId, isTyping) => {
			if (me && userId !== me.id) setIsOtherTyping(isTyping);
		},
		onReadReceipt: () => {},
		onCallSignal: (event) => handleCallSignal(event),
		onError: (message) => setError(message),
		onPresenceUpdate: (userId, isOnline) => {
			if (userId === null || userId === otherUserId) setIsOtherOnline(isOnline);
		}
	});

	const call = useWebRTCCall({ sendCallSignal });
	const handleCallSignal = call.handleCallSignal;

	useEffect(() => {
		if (isConnected && !isLoading && booking?.status === "accepted") {
			markRead();
		}
	}, [isConnected, isLoading, booking?.status, markRead]);

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	}

	function handleSendMessage() {
		const content = inputValue.trim();
		if (!content || !isConnected) return;
		sendMessage(content);
		setInputValue("");
		sendTyping(false);
		if (textareaRef.current) textareaRef.current.style.height = "auto";
	}

	function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setInputValue(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;

		sendTyping(true);
		if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
		typingTimeoutRef.current = setTimeout(() => sendTyping(false), TYPING_STOP_DELAY_MS);
	}

	function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setIsUploadingFile(true);
		const reader = new FileReader();
		reader.onloadend = () => {
			sendFile(reader.result as string, file.name);
			setIsUploadingFile(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		};
		reader.readAsDataURL(file);
	}

	const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
	messages.forEach((msg) => {
		const date = formatDate(msg.createdAt);
		const last = groupedMessages[groupedMessages.length - 1];
		if (last && last.date === date) {
			last.messages.push(msg);
		} else {
			groupedMessages.push({ date, messages: [msg] });
		}
	});

	if (isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-bg">
				<Spinner size="md" />
			</div>
		);
	}

	if (error || !booking) {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center bg-bg gap-4 px-6">
				<p className="text-text-muted text-sm">{error || "Chat not found."}</p>
				<Link href="/dashboard/bookings" className="text-accent text-sm font-medium hover:underline">← Back to Bookings</Link>
			</div>
		);
	}

	if (booking.status !== "accepted") {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center bg-bg gap-4 px-6 text-center">
				<div className="w-16 h-16 rounded-2xl bg-bg-soft border border-border flex items-center justify-center">
					<svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
				</div>
				<h2 className="text-lg font-semibold text-text-primary">Chat Not Available</h2>
				<p className="text-sm text-text-body max-w-sm">
					{booking.status === "pending"
						? "Chat will be available once the consultant accepts your request."
						: "This consultation has ended."}
				</p>
				<Link href="/dashboard/bookings" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 transition">
					← Back to Bookings
				</Link>
			</div>
		);
	}

	const myName = `${me?.firstName || ""} ${me?.lastName || ""}`.trim();
	const nextSession = sessions
		.filter(isSessionUpcoming)
		.sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

	return (
		<div className="flex h-dvh flex-col bg-bg">
			<ChatHeader
				otherUserName={otherUserName}
				otherUserPic={otherUserPic}
				isConnected={isConnected}
				isOtherOnline={isOtherOnline}
				showStartContract={me?.role === "client"}
				onStartContract={() => setShowCreateContract(true)}
				onStartVoiceCall={() => call.startCall("voice")}
				onStartVideoCall={() => call.startCall("video")}
			/>

			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-base px-4 py-3">
				{nextSession ? (
					<div className="min-w-0">
						<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Next session</p>
						<p className="mt-0.5 truncate text-sm font-medium text-text-primary">
							{formatSessionDate(nextSession.startAt)} · {formatSessionTime(nextSession.startAt)} –{" "}
							{formatSessionTime(nextSession.endAt)}
							<span className="ml-2 text-xs font-normal text-text-muted">
								{formatRelative(nextSession.startAt)}
								{nextSession.status === "pending" ? " · awaiting confirmation" : ""}
								{nextSession.mode === "offline" ? ` · ${nextSession.location}` : ""}
							</span>
						</p>
					</div>
				) : (
					<p className="text-sm text-text-muted">No session scheduled yet.</p>
				)}

				<div className="flex items-center gap-2">
					<Link
						href="/dashboard/sessions"
						className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-soft transition"
					>
						All sessions
					</Link>
					{me?.role === "client" && (
						<button
							type="button"
							onClick={() => setShowScheduleSession(true)}
							className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent hover:opacity-90 transition cursor-pointer"
						>
							Schedule session
						</button>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-4 py-6 space-y-6" id="chat-messages">
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center py-12">
						<div className="w-14 h-14 rounded-2xl bg-bg-soft border border-border flex items-center justify-center mb-4">
							<svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
							</svg>
						</div>
						<p className="text-sm font-medium text-text-primary">Start the conversation</p>
						<p className="mt-1 text-xs text-text-muted">Say hello and share what you need help with.</p>
					</div>
				) : (
					groupedMessages.map((group) => (
						<div key={group.date}>
							<div className="flex items-center gap-3 mb-4">
								<div className="flex-1 h-px bg-border" />
								<span className="text-xs font-medium text-text-muted px-2">{group.date}</span>
								<div className="flex-1 h-px bg-border" />
							</div>

							<div className="space-y-3">
								{group.messages.map((msg, idx) => {
									const isMine = msg.senderId === me?.id;
									const senderName = isMine
										? myName
										: msg.firstName
										? `${msg.firstName} ${msg.lastName || ""}`.trim()
										: msg.username || "";
									const senderPic = isMine ? me?.profilePicture : msg.profilePicture;
									const prevMsg = group.messages[idx - 1];
									const isGrouped = Boolean(prevMsg && prevMsg.senderId === msg.senderId);

									return (
										<MessageBubble
											key={msg.id}
											message={msg}
											isMine={isMine}
											senderName={senderName}
											senderPic={senderPic}
											showAvatarAndName={!isGrouped}
										/>
									);
								})}
							</div>
						</div>
					))
				)}
				{isOtherTyping && <TypingIndicator name={otherUserName || "They"} />}
				<div ref={messagesEndRef} />
			</div>

			<div className="border-t border-border bg-base flex-shrink-0 px-4 py-3">
				<div className="flex items-end gap-3 max-w-4xl mx-auto">
					<input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={!isConnected || isUploadingFile}
						aria-label="Attach file"
						className="flex-shrink-0 w-11 h-11 rounded-xl border border-border-strong flex items-center justify-center hover:bg-bg-soft disabled:opacity-40 cursor-pointer transition"
					>
						<svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.485 8.486l6.113-6.114" />
						</svg>
					</button>

					<div className="flex-1 relative">
						<textarea
							ref={textareaRef}
							id="chat-input"
							value={inputValue}
							onChange={handleTextareaChange}
							onKeyDown={handleKeyDown}
							placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
							rows={1}
							disabled={!isConnected}
							className="w-full rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none disabled:opacity-50 max-h-40"
							style={{ height: "auto" }}
						/>
					</div>
					<button
						onClick={handleSendMessage}
						disabled={!inputValue.trim() || !isConnected}
						id="btn-send-message"
						className="flex-shrink-0 w-11 h-11 rounded-xl bg-accent flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
					>
						<svg className="w-5 h-5 text-on-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
					</button>
				</div>
				<p className="text-xs text-text-muted text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
			</div>

			{showCreateContract && (
				<CreateContractModal
					bookingId={bookingId}
					onClose={() => setShowCreateContract(false)}
					onCreated={(contract: Contract) => {
						setShowCreateContract(false);
						router.push(`/dashboard/contracts/${contract.id}`);
					}}
				/>
			)}

			{showScheduleSession && booking && (
				<ScheduleSessionModal
					consultantId={booking.consultant_id}
					bookingId={bookingId}
					onClose={() => setShowScheduleSession(false)}
					onDone={(session) => {
						setSessions((prev) => [...prev, session]);
						setShowScheduleSession(false);
					}}
				/>
			)}

			<CallModal
				callState={call.callState}
				callType={call.callType}
				localStream={call.localStream}
				remoteStream={call.remoteStream}
				otherUserName={otherUserName || "Consulo user"}
				error={call.error}
				onAccept={() => call.acceptPendingCall()}
				onReject={() => call.rejectCall()}
				onEnd={() => call.endCall()}
			/>
		</div>
	);
}
