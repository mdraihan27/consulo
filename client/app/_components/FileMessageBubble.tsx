type FileMessageBubbleProps = {
	fileUrl: string;
	fileName: string;
	isMine: boolean;
};

export function FileMessageBubble({ fileUrl, fileName, isMine }: FileMessageBubbleProps) {
	const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);

	return (
		<a
			href={fileUrl}
			target="_blank"
			rel="noopener noreferrer"
			className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm max-w-full ${
				isMine ? "bg-accent text-on-accent rounded-br-sm" : "bg-base border border-border text-text-primary rounded-bl-sm"
			}`}
		>
			{isImage ? (
				<img src={fileUrl} alt={fileName} className="max-h-40 rounded-lg object-cover" />
			) : (
				<>
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span className="truncate">{fileName}</span>
				</>
			)}
		</a>
	);
}
