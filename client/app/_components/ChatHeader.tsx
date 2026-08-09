import Link from "next/link";
import { Avatar } from "./Avatar";

type ChatHeaderProps = {
	otherUserName: string;
	otherUserPic?: string;
	isConnected: boolean;
	isOtherOnline: boolean;
	showStartContract: boolean;
	onStartContract: () => void;
	onStartVoiceCall: () => void;
	onStartVideoCall: () => void;
};

export function ChatHeader({
	otherUserName,
	otherUserPic,
	isConnected,
	isOtherOnline,
	showStartContract,
	onStartContract,
	onStartVoiceCall,
	onStartVideoCall
}: ChatHeaderProps) {
	return (
		<header className="border-b border-border bg-base flex-shrink-0">
			<div className="flex items-center gap-4 px-4 py-3">
				<Link href="/dashboard/inbox" className="text-text-muted hover:text-text-primary transition p-1 rounded-lg hover:bg-bg-soft">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
				</Link>

				<Avatar name={otherUserName || "?"} picture={otherUserPic} size="md" />

				<div className="flex-1 min-w-0">
					<p className="font-semibold text-text-primary text-sm truncate">{otherUserName || "Chat"}</p>
					<div className="flex items-center gap-1.5">
						<div className={`w-2 h-2 rounded-full ${isConnected && isOtherOnline ? "bg-accent" : "bg-text-muted"}`} />
						<span className="text-xs text-text-muted">
							{!isConnected ? "Connecting..." : isOtherOnline ? "Online" : "Offline"}
						</span>
					</div>
				</div>

				<button
					type="button"
					onClick={onStartVoiceCall}
					disabled={!isConnected}
					aria-label="Start voice call"
					className="rounded-md border border-border-strong p-2 text-text-primary hover:bg-bg-soft disabled:opacity-40 cursor-pointer"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
					</svg>
				</button>

				<button
					type="button"
					onClick={onStartVideoCall}
					disabled={!isConnected}
					aria-label="Start video call"
					className="rounded-md border border-border-strong p-2 text-text-primary hover:bg-bg-soft disabled:opacity-40 cursor-pointer"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
				</button>

				{showStartContract && (
					<button
						type="button"
						onClick={onStartContract}
						className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-on-accent hover:opacity-95 cursor-pointer"
					>
						Start Contract
					</button>
				)}

				<Link href="/" className="hidden sm:block">
					<img src="/assets/images/logo.svg" alt="Consulo" className="h-5 w-auto opacity-70" />
				</Link>
			</div>
		</header>
	);
}
