import * as LucideIcons from "lucide-react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

export type IconName = {
	[Key in keyof typeof LucideIcons]: (typeof LucideIcons)[Key] extends LucideIcon
		? Key
		: never;
}[keyof typeof LucideIcons];

export type IconColor = "black" | "white" | "current";

export interface IconProps {
	name: IconName;
	color: IconColor;
	size?: number;
	strokeWidth?: number;
	title?: string;
	className?: string;
	style?: CSSProperties;
}

const iconColorMap: Record<IconColor, string> = {
	black: "var(--color-text-on-surface)",
	white: "var(--color-text-inverse)",
	current: "currentColor",
};

const iconRegistry = LucideIcons as unknown as Record<IconName, LucideIcon>;
const fallbackIcon = LucideIcons.CircleHelp as LucideIcon;

export default function Icon({
	name,
	color,
	size = 16,
	strokeWidth = 2,
	title,
	className,
	style,
}: IconProps) {
	const IconComponent = iconRegistry[name] ?? fallbackIcon;
	const resolvedColor =
		typeof style?.color === "string" ? style.color : iconColorMap[color];

	return (
		<IconComponent
			size={size}
			strokeWidth={strokeWidth}
			color={resolvedColor}
			className={className}
			style={style}
			aria-label={title}
			aria-hidden={title ? undefined : true}
		/>
	);
}
