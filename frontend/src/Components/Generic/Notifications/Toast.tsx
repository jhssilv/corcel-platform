import { useEffect, useState } from 'react';
import type { ToastMessage } from '../../../Context/Generic/Notifications/ToastContext';
import styles from './toast.module.css';

interface ToastProps {
    toast: ToastMessage;
    onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const duration = toast.duration || 3000;
        const timer = setTimeout(() => {
            setIsLeaving(true);
        }, duration);

        return () => clearTimeout(timer);
    }, [toast.duration]);

    const handleAnimationEnd = () => {
        if (isLeaving) {
            onClose();
        }
    };

    const typeClass = toast.type ? styles[`toast-${toast.type}`] : styles['toast-info'];

    return (
        <div
            className={`${styles.toast} ${typeClass} ${isLeaving ? styles.leaving : styles.entering}`}
            onAnimationEnd={handleAnimationEnd}
            role="alert"
        >
            <div className={styles['toast-content']}>{toast.text}</div>
            <button className={styles['toast-close']} onClick={() => setIsLeaving(true)} aria-label="Close">
                &times;
            </button>
        </div>
    );
}
