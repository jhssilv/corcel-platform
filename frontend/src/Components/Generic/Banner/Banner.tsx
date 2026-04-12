import { HTMLAttributes, ReactNode } from 'react';
import styles from './banner.module.css';

export type BannerVariant = 'info' | 'warning' | 'danger' | 'success';

export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    variant?: BannerVariant;
}

export function Banner({ children, variant = 'info', className = '', ...props }: BannerProps) {
    const classes = [styles.banner, styles[variant], className].filter(Boolean).join(' ');

    return (
        <div className={classes} role={variant === 'danger' ? 'alert' : 'status'} {...props}>
            {children}
        </div>
    );
}

export default Banner;
