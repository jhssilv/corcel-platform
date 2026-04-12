import { HTMLAttributes, ReactNode } from 'react';
import { Stack } from '..';
import styles from '../../../styles/dialog.module.css';

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    onClose?: () => void;
}

export function DialogHeader({
    children,
    onClose,
    className = '',
    ...props
}: DialogHeaderProps) {
    const headerClass = `${styles.header} ${className}`.trim();

    return (
        <Stack alignX="space-between" alignY="center" className={headerClass} {...props}>
            <h2 className={styles.title}>{children}</h2>
            {onClose && (
                <Stack alignX="center" alignY="center" as="button"
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Fechar diálogo"
                >
                    &times;
                </Stack>
            )}
        </Stack>
    );
}

export default DialogHeader;
