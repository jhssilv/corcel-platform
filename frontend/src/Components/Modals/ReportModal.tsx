import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { requestReport } from '../../Api';
import { useSnackbar } from '../../Context/Generic';
import { Dialog, DialogHeader, Stack, Button, DialogFooter } from '../Generic';
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
        <Dialog isOpen={isOpen} onClose={onClose} className={styles['report-modal']}>
            <DialogHeader onClose={onClose}>Gerar Relatório</DialogHeader>

            <Stack direction="vertical" gap={12} className={styles['modal-body']}>
                <p className={styles['report-text']}>
                    Gerar relatório para os <b>{textCount}</b> textos <b>filtrados</b>?
                </p>
            </Stack>

            <DialogFooter align="right">
                <Button variant="action" onClick={onClose}>Cancelar</Button>
                <Button
                    variant="action"
                    tier="primary"
                    onClick={() => {
                        void handleConfirm();
                    }}
                    disabled={!confirmEnabled}
                >
                    Confirmar
                </Button>
            </DialogFooter>
        </Dialog>
    );
}

export default ReportModal;