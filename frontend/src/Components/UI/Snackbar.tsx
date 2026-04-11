import { useEffect, useState } from 'react';
import type { SnackbarMessage } from '../../Context/UI/SnackbarContext';
import styles from '../../styles/snackbar.module.css';

interface SnackbarProps {
    snackbar: SnackbarMessage;
    onClose: () => void;
}

export default function Snackbar({ snackbar, onClose }: SnackbarProps) {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const duration = snackbar.duration || 4000;
        const timer = setTimeout(() => {
            setIsLeaving(true);
        }, duration);

        return () => clearTimeout(timer);
    }, [snackbar.duration]);

    const handleAnimationEnd = () => {
        if (isLeaving) {
            onClose();
        }
    };

    const handleActionClick = () => {
        if (snackbar.onAction) {
            snackbar.onAction();
        }
        setIsLeaving(true);
    };

    const typeClass = snackbar.type && snackbar.type !== 'default' 
        ? styles[`snackbar-${snackbar.type}`] 
        : '';

    return (
        <div
            className={`${styles.snackbar} ${typeClass} ${isLeaving ? styles.leaving : styles.entering}`}
            onAnimationEnd={handleAnimationEnd}
            role="status"
        >
            <div className={styles['snackbar-content']}>{snackbar.text}</div>
            
            <div className={styles['snackbar-actions']}>
                {snackbar.actionText && (
                    <button className={styles['snackbar-action-button']} onClick={handleActionClick}>
                        {snackbar.actionText}
                    </button>
                )}
                <button className={styles['snackbar-close']} onClick={() => setIsLeaving(true)} aria-label="Close">
                    &times;
                </button>
            </div>
        </div>
    );
}
