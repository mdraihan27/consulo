export function TypingIndicator({ name }: { name: string }) {
	return (
		<div className="flex items-center gap-2 px-1">
			<div className="flex gap-1">
				<span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:-0.3s]" />
				<span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:-0.15s]" />
				<span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" />
			</div>
			<span className="text-xs text-text-muted">{name} is typing...</span>
		</div>
	);
}
