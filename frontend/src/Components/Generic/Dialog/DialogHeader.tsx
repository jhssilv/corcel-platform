import { HTMLAttributes, ReactNode } from 'react';
import { Stack, Icon, IconName } from '..';
import styles from '../../../styles/dialog.module.css';

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    onClose?: () => void;
    icon?: IconName;
    iconColor?: 'white' | 'black';
}

export function DialogHeader({
    children,
    onClose,
    icon,
    iconColor = 'white',
    className = '',
    ...props
}: DialogHeaderProps) {
    const headerClass = `${styles.header} ${className}`.trim();

    return (
        <Stack alignX="space-between" alignY="center" className={headerClass} {...props}>
            <Stack alignY="center" gap={8} className={styles['title-container']}>
                {icon && <Icon name={icon} color={iconColor} />}
                <h2 className={styles.title}>{children}</h2>
            </Stack>
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
