import { HTMLAttributes, ReactNode } from "react";
import styles from "./section_header.module.css";

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
	heading: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
	preserveCase?: boolean;
}

export function SectionHeader({
	heading,
	subtitle,
	actions,
	preserveCase = false,
	className = "",
	...props
}: SectionHeaderProps) {
	const classes = [styles.header, className].filter(Boolean).join(" ");
	const titleClasses = [styles.title, preserveCase ? styles.preserveCase : ""]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={classes} {...props}>
			<div className={styles.left}>
				<h3 className={titleClasses}>{heading}</h3>
				{subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
			</div>
			{actions ? <div className={styles.right}>{actions}</div> : null}
		</div>
	);
}

export default SectionHeader;
