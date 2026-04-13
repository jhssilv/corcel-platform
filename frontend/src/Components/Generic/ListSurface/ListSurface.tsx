import { HTMLAttributes, ReactNode } from "react";
import styles from "./list_surface.module.css";

export interface ListSurfaceProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

export interface ListSurfaceItemProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

export interface ListSurfaceTextProps extends HTMLAttributes<HTMLSpanElement> {
	children: ReactNode;
	tone?: "default" | "danger";
	truncate?: boolean;
}

export function ListSurface({
	children,
	className = "",
	...props
}: ListSurfaceProps) {
	const classes = [styles.listSurface, className].filter(Boolean).join(" ");

	return (
		<div className={classes} {...props}>
			{children}
		</div>
	);
}

export function ListSurfaceItem({
	children,
	className = "",
	...props
}: ListSurfaceItemProps) {
	const classes = [styles.listSurfaceItem, className].filter(Boolean).join(" ");

	return (
		<div className={classes} {...props}>
			{children}
		</div>
	);
}

export function ListSurfaceText({
	children,
	tone = "default",
	truncate = true,
	className = "",
	...props
}: ListSurfaceTextProps) {
	const classes = [
		styles.listSurfaceText,
		truncate ? styles.truncate : "",
		tone === "danger" ? styles.danger : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<span className={classes} {...props}>
			{children}
		</span>
	);
}

export default ListSurface;
