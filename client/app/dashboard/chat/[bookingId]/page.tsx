"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, getChatHistory, markBookingRead, respondToBooking, type PublicUser, type ChatMessage, type Contract } from "../../../_lib/api";
import { useChatSocket } from "../../../_lib/useChatSocket";
import { useCall } from "../../../_components/CallProvider";
import { CreateContractModal } from "../../../_components/CreateContractModal";
import { ChatHeader } from "../../../_components/ChatHeader";
import { MessageBubble } from "../../../_components/MessageBubble";
import { TypingIndicator } from "../../../_components/TypingIndicator";
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
	const [isRespondingBooking, setIsRespondingBooking] = useState(false);

	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Someone who has scrolled up to read older messages should stay put when a
	// new one lands, so auto-scroll only kicks in while they are near the bottom.
	const isPinnedToBottomRef = useRef(true);
	const hasDoneFirstScrollRef = useRef(false);

	// Scroll the message list itself rather than calling scrollIntoView, which
	// walks up to the nearest scrollable ancestor and can drag the whole page.
	const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
		const container = messagesContainerRef.current;
		if (!container) return;
		container.scrollTo({ top: container.scrollHeight, behavior });
	}, []);

	function handleMessagesScroll() {
		const container = messagesContainerRef.current;
		if (!container) return;
		const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
		isPinnedToBottomRef.current = distanceFromBottom < 120;
	}

	useEffect(() => {
		if (isLoading) return;

		// The first paint jumps straight to the newest message; smooth-scrolling
		// through a long history is a slow visible crawl.
		if (!hasDoneFirstScrollRef.current) {
			hasDoneFirstScrollRef.current = true;
			requestAnimationFrame(() => scrollToBottom("auto"));
			return;
		}

		if (isPinnedToBottomRef.current) {
			requestAnimationFrame(() => scrollToBottom("smooth"));
		}
	}, [messages, isLoading, scrollToBottom]);

	// The typing indicator adds height at the bottom of the list.
	useEffect(() => {
		if (isOtherTyping && isPinnedToBottomRef.current) scrollToBottom("smooth");
	}, [isOtherTyping, scrollToBottom]);

	// Grow the composer with its content, capped, and shrink back when cleared.
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
	}, [inputValue]);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setIsLoading(true);
			try {
				const [userData, chatData] = await Promise.all([
					getMe(),
					getChatHistory(bookingId)
				]);
				if (!isMounted) return;
				setMe(userData);
				setBooking(chatData.booking);
				setMessages(chatData.messages);

				const isFreelancer = userData.role === "freelancer";
				const otherName = isFreelancer
					? `${chatData.booking?.client_first_name || ""} ${chatData.booking?.client_last_name || ""}`.trim() || chatData.booking?.client_username || "Client"
					: `${chatData.booking?.consultant_first_name || ""} ${chatData.booking?.consultant_last_name || ""}`.trim() || chatData.booking?.consultant_username || "Consultant";
				const otherPic = isFreelancer ? chatData.booking?.client_profile_picture : chatData.booking?.consultant_profile_picture;
				setOtherUserName(otherName);
				setOtherUserPic(otherPic);
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
		if (otherMsg && otherMsg.firstName) {
			setOtherUserName(`${otherMsg.firstName || ""} ${otherMsg.lastName || ""}`.trim() || otherMsg.username || "");
			if (otherMsg.profilePicture) {
				setOtherUserPic(otherMsg.profilePicture);
			}
		}
	}, [messages, me]);

	const otherUserId: string | undefined = me && booking ? (booking.client_id === me.id ? booking.consultant_id : booking.client_id) : undefined;

	const { isConnected, sendMessage, sendFile, sendTyping, markRead } = useChatSocket({
		bookingId,
		onNewMessage: (msg) => {
			setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
			if (msg.senderId !== me?.id) {
				markRead();
			}
		},
		onBookingUpdated: (status) => setBooking((prev: any) => ({ ...prev, status })),
		onTypingUpdate: (userId, isTyping) => {
			if (me && userId !== me.id) setIsOtherTyping(isTyping);
		},
		onReadReceipt: () => {},
		// Calls are handled globally by CallProvider. This socket belongs to the
		// same user and therefore also receives the signal, so it must ignore it
		// or the handshake would run twice.
		onCallSignal: () => {},
		onError: (message) => setError(message),
		onPresenceUpdate: (userId, isOnline) => {
			if (userId === null || userId === otherUserId) setIsOtherOnline(isOnline);
		}
	});

	const call = useCall();

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
		// Sending is an explicit intent to be at the bottom, even if they had
		// scrolled up to re-read something first.
		isPinnedToBottomRef.current = true;
	}

	function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setInputValue(e.target.value);

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

	async function handleRespondBooking(action: "accepted" | "declined") {
		setIsRespondingBooking(true);
		try {
			const updated = await respondToBooking(bookingId, action);
			setBooking((prev: any) => ({ ...prev, status: updated.status }));
		} catch (err: any) {
			console.error("Failed to respond to booking:", err);
		} finally {
			setIsRespondingBooking(false);
		}
	}

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

	if (booking.status === "declined") {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center bg-bg gap-4 px-6 text-center">
				<div className="w-16 h-16 rounded-2xl bg-bg-soft border border-border flex items-center justify-center">
					<svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
				<h2 className="text-lg font-semibold text-text-primary">Consultation Request Declined</h2>
				<p className="text-sm text-text-body max-w-sm">
					This booking request has been declined and the conversation is now closed.
				</p>
				<Link href="/dashboard/bookings" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 transition">
					← Back to Bookings
				</Link>
			</div>
		);
	}

	const isConsultant = me?.id === booking.consultant_id || me?.role === "freelancer";
	const isPending = booking.status === "pending";

	const myName = `${me?.firstName || ""} ${me?.lastName || ""}`.trim();


	return (
		<div className="flex h-dvh flex-col bg-bg">
			<ChatHeader
				otherUserName={otherUserName}
				otherUserPic={otherUserPic}
				isConnected={isConnected}
				isOtherOnline={isOtherOnline}
				showStartContract={me?.role === "client"}
				onStartContract={() => setShowCreateContract(true)}
				onStartVoiceCall={() => call.startCall(bookingId, "voice")}
				onStartVideoCall={() => call.startCall(bookingId, "video")}
			/>

			{/* Consultation request pending status banner */}
			{isPending && (
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent/20 bg-accent/10 px-4 py-2.5 text-xs text-text-primary">
					<div className="flex items-center gap-2">
						<span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
						<span>
							{isConsultant ? (
								<><strong>New Consultation Request:</strong> Chat and discuss with the client below before accepting.</>
							) : (
								<><strong>Request Sent:</strong> Chat and discuss consultation details with the expert.</>
							)}
						</span>
					</div>

					{isConsultant && (
						<div className="flex items-center gap-2">
							<button
								type="button"
								disabled={isRespondingBooking}
								onClick={() => handleRespondBooking("accepted")}
								className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-on-accent hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
							>
								{isRespondingBooking ? "Updating..." : "Accept Request"}
							</button>
							<button
								type="button"
								disabled={isRespondingBooking}
								onClick={() => handleRespondBooking("declined")}
								className="rounded-lg border border-border bg-base px-3 py-1 text-xs font-semibold text-text-body hover:bg-bg-soft transition disabled:opacity-50 cursor-pointer"
							>
								Decline
							</button>
						</div>
					)}
				</div>
			)}

			<div
				ref={messagesContainerRef}
				onScroll={handleMessagesScroll}
				className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 space-y-6"
				id="chat-messages"
			>
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
							className="w-full rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none disabled:opacity-50 max-h-40 overflow-y-auto"
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

		</div>
	);
}
