import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	primary: "bg-accent text-on-accent hover:opacity-95 disabled:opacity-60",
	secondary: "border border-border-strong text-text-primary hover:bg-bg-soft disabled:opacity-60",
	ghost: "text-accent hover:underline disabled:opacity-60"
};

export function Button({ variant = "primary", className = "", disabled, ...props }: ButtonProps) {
	const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed";
	return (
		<button
			{...props}
			disabled={disabled}
			className={`${base} ${VARIANT_CLASSES[variant]} ${disabled ? "" : "cursor-pointer"} ${className}`}
		/>
	);
}
