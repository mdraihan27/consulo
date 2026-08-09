type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = {
	name: string;
	picture?: string;
	size?: AvatarSize;
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
	sm: "w-9 h-9 text-sm rounded-full",
	md: "w-11 h-11 text-base rounded-xl",
	lg: "w-12 h-12 text-lg rounded-full"
};

export function Avatar({ name, picture, size = "sm" }: AvatarProps) {
	const initials = (name || "??").slice(0, 2).toUpperCase();
	return (
		<div className={`${SIZE_CLASSES[size]} bg-bg-soft border border-border flex items-center justify-center overflow-hidden flex-shrink-0`}>
			{picture ? (
				<img src={picture} alt={name} className="w-full h-full object-cover" />
			) : (
				<span className="font-semibold text-text-muted">{initials}</span>
			)}
		</div>
	);
}
