import type { ChatMessage } from "../_lib/api";
import { Avatar } from "./Avatar";
import { FileMessageBubble } from "./FileMessageBubble";

function formatTime(dateStr: string) {
	return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

type MessageBubbleProps = {
	message: ChatMessage;
	isMine: boolean;
	senderName: string;
	senderPic?: string;
	showAvatarAndName: boolean;
};

export function MessageBubble({ message, isMine, senderName, senderPic, showAvatarAndName }: MessageBubbleProps) {
	return (
		<div className={`flex items-end gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
			<div className="w-8 flex-shrink-0">
				{showAvatarAndName && <Avatar name={senderName} picture={senderPic} size="sm" />}
			</div>

			<div className={`flex flex-col gap-1 max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
				{showAvatarAndName && (
					<span className={`text-xs text-text-muted font-medium ${isMine ? "text-right" : "text-left"}`}>
						{isMine ? "You" : senderName}
					</span>
				)}

				{message.messageType === "file" && message.fileUrl && message.fileName ? (
					<FileMessageBubble fileUrl={message.fileUrl} fileName={message.fileName} isMine={isMine} />
				) : (
					<div
						className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
							isMine ? "bg-accent text-on-accent rounded-br-sm" : "bg-base border border-border text-text-primary rounded-bl-sm"
						}`}
					>
						{message.content}
					</div>
				)}

				<span className={`text-xs text-text-muted ${isMine ? "text-right" : "text-left"}`}>
					{formatTime(message.createdAt)}
				</span>
			</div>
		</div>
	);
}
