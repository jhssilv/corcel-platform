import { HTMLAttributes } from 'react';
import styles from './progress_inline.module.css';

export interface ProgressInlineProps extends HTMLAttributes<HTMLDivElement> {
    progress: number;
    statusMessage?: string;
    hintText?: string;
    showPercent?: boolean;
    showSpinner?: boolean;
}

export function ProgressInline({
    progress,
    statusMessage,
    hintText,
    showPercent = true,
    showSpinner = false,
    className = '',
    ...props
}: ProgressInlineProps) {
    const safeProgress = Math.max(0, Math.min(100, progress));
    const classes = [styles.root, className].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${safeProgress}%` }} />
            </div>
            {showPercent ? <p className={styles.percent}>{Math.round(safeProgress)}%</p> : null}
            {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
            {hintText ? <p className={styles.hint}>{hintText}</p> : null}
            {showSpinner ? <div className={styles.spinner} /> : null}
        </div>
    );
}

export default ProgressInline;
