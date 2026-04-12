import { type ReactNode } from 'react';
import styles from '../../../styles/dialog_footer.module.css';

export interface DialogFooterProps {
    children: ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

export function DialogFooter({ children, align = 'right', className = '' }: DialogFooterProps) {
    const classes = [
        styles['dialog-footer'],
        styles[`align-${align}`],
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            {children}
        </div>
    );
}
