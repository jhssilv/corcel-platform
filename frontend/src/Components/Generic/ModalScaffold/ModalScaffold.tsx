import { type ReactNode } from 'react';
import { Dialog, DialogHeader, DialogFooter } from '..';
import type { IconName } from '../Icon';
import styles from './modal_scaffold.module.css';

export interface ModalScaffoldProps {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    icon?: IconName;
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
    footer?: ReactNode;
    footerAlign?: 'left' | 'center' | 'right';
}

export function ModalScaffold({
    isOpen,
    onClose,
    title,
    icon,
    size = 'md',
    children,
    className,
    bodyClassName = '',
    footer,
    footerAlign = 'right',
}: ModalScaffoldProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} size={size} className={className}>
            <DialogHeader onClose={onClose} icon={icon}>{title}</DialogHeader>
            <div className={[styles.body, bodyClassName].filter(Boolean).join(' ')}>{children}</div>
            {footer ? <DialogFooter align={footerAlign}>{footer}</DialogFooter> : null}
        </Dialog>
    );
}

export default ModalScaffold;
