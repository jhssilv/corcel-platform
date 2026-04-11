import { useMemo } from 'react';
import type { ToastMessage, ToastPosition } from '../../Context/UI/ToastContext';
import Toast from './Toast';
import styles from '../../styles/toast.module.css';

interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
    const positionedToasts = useMemo(() => {
        const grouped: Record<ToastPosition, ToastMessage[]> = {
            'top-right': [],
            'top-left': [],
            'top-center': [],
            'bottom-right': [],
            'bottom-left': [],
            'bottom-center': [],
        };
        toasts.forEach((toast) => {
            const pos = toast.position || 'top-right';
            grouped[pos].push(toast);
        });
        return grouped;
    }, [toasts]);

    return (
        <>
            {(Object.keys(positionedToasts) as ToastPosition[]).map((position) => {
                const group = positionedToasts[position];
                if (group.length === 0) {
                    return null;
                }

                return (
                    <div key={position} className={`${styles['toast-container']} ${styles[position]}`}>
                        {group.map((toast) => (
                            <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                        ))}
                    </div>
                );
            })}
        </>
    );
}
