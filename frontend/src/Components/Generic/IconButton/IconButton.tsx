import { ButtonHTMLAttributes } from 'react';
import Icon, { type IconName } from '../Icon';
import styles from './icon_button.module.css';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'neutral' | 'subtle' | 'danger';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon: IconName;
    label: string;
    size?: IconButtonSize;
    variant?: IconButtonVariant;
    iconColor?: 'black' | 'white' | 'current';
    strokeWidth?: number;
}

export function IconButton({
    icon,
    label,
    size = 'md',
    variant = 'neutral',
    iconColor = 'current',
    strokeWidth,
    className = '',
    type = 'button',
    ...props
}: IconButtonProps) {
    const classes = [
        styles.iconButton,
        styles[`size-${size}`],
        styles[`variant-${variant}`],
        className,
    ].filter(Boolean).join(' ');

    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

    return (
        <button type={type} className={classes} aria-label={label} title={label} {...props}>
            <Icon name={icon} color={iconColor} size={iconSize} strokeWidth={strokeWidth} />
        </button>
    );
}

export default IconButton;
