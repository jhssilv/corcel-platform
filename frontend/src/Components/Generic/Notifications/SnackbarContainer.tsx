import { useMemo } from 'react';
import type { SnackbarMessage, SnackbarPosition } from '../../../Context/Generic/Notifications/SnackbarContext';
import Snackbar from './Snackbar';
import styles from './snackbar.module.css';

interface SnackbarContainerProps {
    snackbars: SnackbarMessage[];
    removeSnackbar: (id: string) => void;
}

export default function SnackbarContainer({ snackbars, removeSnackbar }: SnackbarContainerProps) {
    const positionedSnackbars = useMemo(() => {
        const grouped: Record<SnackbarPosition, SnackbarMessage[]> = {
            'top-right': [],
            'top-left': [],
            'top-center': [],
            'bottom-right': [],
            'bottom-left': [],
            'bottom-center': [],
        };
        snackbars.forEach((snackbar) => {
            const pos = snackbar.position || 'bottom-center';
            grouped[pos].push(snackbar);
        });
        return grouped;
    }, [snackbars]);

    return (
        <>
            {(Object.keys(positionedSnackbars) as SnackbarPosition[]).map((position) => {
                const group = positionedSnackbars[position];
                if (group.length === 0) {
                    return null;
                }

                return (
                    <div key={position} className={`${styles['snackbar-container']} ${styles[position]}`}>
                        {group.map((snackbar) => (
                            <Snackbar key={snackbar.id} snackbar={snackbar} onClose={() => removeSnackbar(snackbar.id)} />
                        ))}
                    </div>
                );
            })}
        </>
    );
}
