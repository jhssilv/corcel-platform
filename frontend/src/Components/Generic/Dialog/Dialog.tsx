import { HTMLAttributes, ReactNode, useEffect, useRef } from "react";
import { Stack } from "..";
import styles from "./dialog.module.css";

export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	size?: "sm" | "md" | "lg";
	trapFocus?: boolean;
	closeOnOverlayClick?: boolean;
}

export function Dialog({
	isOpen,
	onClose,
	children,
	size = "md",
	trapFocus = true,
	closeOnOverlayClick = true,
	className = "",
	...props
}: DialogProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onCloseRef.current();
			}

			if (e.key === "Tab" && trapFocus && dialogRef.current) {
				const focusableElements = dialogRef.current.querySelectorAll(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				);

				const firstElement = focusableElements[0] as HTMLElement;
				const lastElement = focusableElements[
					focusableElements.length - 1
				] as HTMLElement;

				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						lastElement?.focus();
						e.preventDefault();
					}
				} else {
					if (document.activeElement === lastElement) {
						firstElement?.focus();
						e.preventDefault();
					}
				}
			}
		};

		// Auto-focus first element
		if (trapFocus && dialogRef.current) {
			const focusableElements = dialogRef.current.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			const firstElement = focusableElements[0] as HTMLElement;
			if (firstElement) {
				// Use a short timeout to prevent scroll jumping
				setTimeout(() => firstElement.focus(), 10);
			} else {
				dialogRef.current.focus();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, trapFocus]);

	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget && closeOnOverlayClick) {
			onCloseRef.current();
		}
	};

	return (
		<Stack
			alignY="center"
			alignX="center"
			className={styles.overlay}
			onClick={handleOverlayClick}
		>
			<Stack
				direction="vertical"
				ref={dialogRef}
				className={[styles.dialog, styles[`size-${size}`], className]
					.filter(Boolean)
					.join(" ")}
				role="dialog"
				aria-modal="true"
				tabIndex={-1}
				{...props}
			>
				{children}
			</Stack>
		</Stack>
	);
}

export default Dialog;
