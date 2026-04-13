import { TextareaHTMLAttributes } from "react";
import styles from "./text_area.module.css";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	variant?: "default" | "editor";
}

export function TextArea({
	variant = "default",
	className = "",
	...props
}: TextAreaProps) {
	const classes = [styles.textArea, styles[variant], className]
		.filter(Boolean)
		.join(" ");

	return <textarea className={classes} {...props} />;
}

export default TextArea;
