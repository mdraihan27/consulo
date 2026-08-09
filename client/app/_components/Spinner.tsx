type SpinnerSize = "sm" | "md";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
	sm: "w-8 h-8 border-4",
	md: "w-12 h-12 border-4"
};

export function Spinner({ size = "sm" }: { size?: SpinnerSize }) {
	return <div className={`${SIZE_CLASSES[size]} border-accent border-t-transparent rounded-full animate-spin`} />;
}
