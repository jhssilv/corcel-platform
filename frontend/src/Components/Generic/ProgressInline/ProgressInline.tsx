import { HTMLAttributes } from 'react';
import styles from './progress_inline.module.css';

export interface ProgressInlineProps extends HTMLAttributes<HTMLDivElement> {
    progress: number;
    statusMessage?: string;
    hintText?: string;
    showPercent?: boolean;
    showSpinner?: boolean;
    mode?: 'bar' | 'spinner';
}

export function ProgressInline({
    progress,
    statusMessage,
    hintText,
    showPercent = true,
    showSpinner = false,
    mode = 'bar',
    className = '',
    ...props
}: ProgressInlineProps) {
    const safeProgress = Math.max(0, Math.min(100, progress));
    const classes = [styles.root, className].filter(Boolean).join(' ');
    const showProgressBar = mode === 'bar';
    const spinnerVisible = showSpinner || mode === 'spinner';

    return (
        <div className={classes} {...props}>
            {showProgressBar ? (
                <>
                    <div className={styles.track}>
                        <div className={styles.fill} style={{ width: `${safeProgress}%` }} />
                    </div>
                    {showPercent ? <p className={styles.percent}>{Math.round(safeProgress)}%</p> : null}
                </>
            ) : null}
            {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
            {hintText ? <p className={styles.hint}>{hintText}</p> : null}
            {spinnerVisible ? <div className={styles.spinner} /> : null}
        </div>
    );
}

export default ProgressInline;
