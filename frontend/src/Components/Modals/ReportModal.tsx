import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { requestReport } from '../../Api';
import { useSnackbar } from '../../Context/Generic';
import styles from '../../styles/report_modal.module.css';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    textCount: number;
}

interface ApiErrorShape {
    error?: string;
}

function ReportModal({ isOpen, onClose, textCount }: ReportModalProps) {
    const [confirmEnabled, setConfirmEnabled] = useState(false);
    const { addSnackbar } = useSnackbar();

    useEffect(() => {
        if (!isOpen) {
            setConfirmEnabled(false);
            return;
        }

        setConfirmEnabled(false);
        const timer = setTimeout(() => setConfirmEnabled(true), 2000);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleConfirm = async () => {
        try {
            const parsed = JSON.parse(localStorage.getItem('textIds') || '[]') as unknown;
            const textIds = Array.isArray(parsed)
                ? parsed.filter((value): value is number => typeof value === 'number')
                : [];

            onClose();
            await requestReport(textIds);
            addSnackbar({
                text: 'Relatório gerado com sucesso!',
                type: 'success',
            });
        } catch (error) {
            console.error(error);
            addSnackbar({
                text: 'Houve um erro ao gerar o relatório.',
                type: 'error',
                duration: 5000
            });
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div className={styles['report-modal']} onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <h2 className={styles['modal-title']}>Gerar Relatório</h2>
                    <button className={styles['modal-close-button']} onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className={styles['modal-body']}>
                    <p className={styles['report-text']}>
                        Gerar relatório para os <b>{textCount}</b> textos <b>filtrados</b>?
                    </p>
                </div>

                <div className={styles['modal-footer']}>
                    <button className={[styles['modal-button'], styles['cancel-button']].join(' ')} onClick={onClose}>Cancelar</button>
                    <button
                        className={[styles['modal-button'], styles['confirm-button'], styles['report-confirm']].join(' ')}
                        onClick={() => {
                            void handleConfirm();
                        }}
                        disabled={!confirmEnabled}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReportModal;