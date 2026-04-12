import { HTMLAttributes, ReactNode } from 'react';
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
        <div className={headerClass} {...props}>
            <h2 className={styles.title}>{children}</h2>
            {onClose && (
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Fechar diálogo"
                >
                    &times;
                </button>
            )}
        </div>
    );
}

export default DialogHeader;
