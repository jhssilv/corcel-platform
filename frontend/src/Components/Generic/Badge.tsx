import type { CSSProperties, ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

export type BadgeVariant = "primary" | "secondary" | "accent" | "danger";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeIconPosition = "right" | "left" | "none";

export interface BadgeProps {
	text: string;
	iconName?: IconName;
	variant?: BadgeVariant;
	size?: BadgeSize;
	iconPosition?: BadgeIconPosition;
	clickable?: boolean;
	onClick?: () => void;
	className?: string;
	style?: CSSProperties;
}

type BadgeColorSet = {
	backgroundColor: string;
	borderColor: string;
	textColor: string;
};

type BadgeSizeSet = {
	fontSize: string;
	padding: string;
	gap: string;
	iconSize: number;
};

const variantColors: Record<BadgeVariant, BadgeColorSet> = {
	primary: {
		backgroundColor: "var(--color-accent)",
		borderColor: "var(--color-accent-hover)",
		textColor: "var(--color-text-inverse)",
	},
	secondary: {
		backgroundColor: "var(--color-info)",
		borderColor: "var(--color-info)",
		textColor: "var(--color-text-inverse)",
	},
	accent: {
		backgroundColor: "var(--color-success)",
		borderColor: "var(--color-success-border)",
		textColor: "var(--color-text-inverse)",
	},
	danger: {
		backgroundColor: "var(--color-danger)",
		borderColor: "var(--color-danger-hover)",
		textColor: "var(--color-text-inverse)",
	},
};

const sizeStyles: Record<BadgeSize, BadgeSizeSet> = {
	sm: {
		fontSize: "0.75rem",
		padding: "0.18rem 0.5rem",
		gap: "0.3rem",
		iconSize: 12,
	},
	md: {
		fontSize: "0.85rem",
		padding: "0.24rem 0.65rem",
		gap: "0.35rem",
		iconSize: 14,
	},
	lg: {
		fontSize: "0.95rem",
		padding: "0.34rem 0.8rem",
		gap: "0.45rem",
		iconSize: 16,
	},
};

function buildContent(
	text: string,
	iconName: IconName | undefined,
	iconPosition: BadgeIconPosition,
	iconSize: number,
): ReactNode {
	const showIcon = iconPosition !== "none" && iconName;

	return (
		<>
			{showIcon && iconPosition === "left" && (
				<Icon name={iconName} color="white" size={iconSize} strokeWidth={2.2} />
			)}
			<span>{text}</span>
			{showIcon && iconPosition === "right" && (
				<Icon name={iconName} color="white" size={iconSize} strokeWidth={2.2} />
			)}
		</>
	);
}

export default function Badge({
	text,
	iconName,
	variant = "primary",
	size = "md",
	iconPosition = "right",
	clickable = false,
	onClick,
	className,
	style,
}: BadgeProps) {
	const colorSet = variantColors[variant];
	const sizeSet = sizeStyles[size];

	const baseStyle: CSSProperties = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: sizeSet.gap,
		padding: sizeSet.padding,
		borderRadius: "999px",
		border: `1px solid ${colorSet.borderColor}`,
		backgroundColor: colorSet.backgroundColor,
		color: colorSet.textColor,
		fontWeight: 600,
		fontSize: sizeSet.fontSize,
		lineHeight: 1.1,
		letterSpacing: "0.01em",
		whiteSpace: "nowrap",
		userSelect: "none",
		transition: "filter 0.18s ease, transform 0.12s ease",
		...style,
	};

	const content = buildContent(text, iconName, iconPosition, sizeSet.iconSize);

	if (clickable) {
		return (
			<button
				type="button"
				className={className}
				onClick={onClick}
				style={{
					...baseStyle,
					cursor: "pointer",
					appearance: "none",
					WebkitAppearance: "none",
				}}
			>
				{content}
			</button>
		);
	}

	return (
		<span className={className} style={baseStyle}>
			{content}
		</span>
	);
}
