import { HTMLAttributes, ReactNode } from "react";
import styles from "./card.module.css";

export interface CardTitleProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	onClose?: () => void;
}

export function CardTitle({
	children,
	onClose,
	className = "",
	...props
}: CardTitleProps) {
	const containerClass = `${styles.titleContainer} ${className}`.trim();

	return (
		<div className={containerClass} {...props}>
			<h3 className={styles.title}>{children}</h3>
			{onClose && (
				<button
					type="button"
					className={styles.closeButton}
					onClick={onClose}
					aria-label="Fechar"
				>
					&times;
				</button>
			)}
		</div>
	);
}

export default CardTitle;
