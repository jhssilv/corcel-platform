import { type ReactNode, type CSSProperties } from "react";
import styles from "./dialog_footer.module.css";

export interface DialogFooterProps {
	children: ReactNode;
	align?: "left" | "center" | "right";
	className?: string;
	style?: CSSProperties;
}

export function DialogFooter({
	children,
	align = "right",
	className = "",
	style,
}: DialogFooterProps) {
	const classes = [styles["dialog-footer"], styles[`align-${align}`], className]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={classes} style={style}>
			{children}
		</div>
	);
}
