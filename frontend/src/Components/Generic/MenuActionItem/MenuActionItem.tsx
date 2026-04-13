import type { ButtonHTMLAttributes } from "react";
import Icon, { type IconName } from "../Icon";
import styles from "./menu_action_item.module.css";

export type MenuActionItemEmphasis = "neutral" | "danger";

export interface MenuActionItemProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	"children" | "className"
> {
	label: string;
	icon: IconName;
	emphasis?: MenuActionItemEmphasis;
	navigates?: boolean;
	testId?: string;
}

export function MenuActionItem({
	label,
	icon,
	emphasis = "neutral",
	navigates = false,
	disabled = false,
	type = "button",
	testId,
	...props
}: MenuActionItemProps) {
	const classes = [styles.item, emphasis === "danger" ? styles.danger : ""]
		.filter(Boolean)
		.join(" ");

	return (
		<button
			type={type}
			className={classes}
			disabled={disabled}
			data-testid={testId}
			{...props}
		>
			<Icon name={icon} color="current" size={18} />
			<span className={styles.label}>{label}</span>
			{navigates ? (
				<Icon
					name="ChevronRight"
					color="current"
					size={16}
					className={styles.trailingIcon}
				/>
			) : null}
		</button>
	);
}

export default MenuActionItem;
