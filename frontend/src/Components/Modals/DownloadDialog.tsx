import { useEffect, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import '../../styles/download_dialog.css';
import downloadTexts from '../../Api/DownloadTexts';
import { useSnackbar } from '../../Context/Generic';
import { Dialog, DialogHeader, Stack, Button } from '../Generic';

interface DownloadDialogProps {
    show: boolean;
    onClose: () => void;
    onDownload?: (useBrackets: boolean) => Promise<unknown> | void;
}

function DownloadDialog({ show, onClose, onDownload }: DownloadDialogProps) {
    const [useBrackets, setUseBrackets] = useState(false);
    const [confirmEnabled, setConfirmEnabled] = useState(false);
    const { addSnackbar } = useSnackbar();

    useEffect(() => {
        if (!show) {
            setConfirmEnabled(false);
            return;
        }

        setConfirmEnabled(false);
        const timer = setTimeout(() => setConfirmEnabled(true), 2000);
        return () => clearTimeout(timer);
    }, [show]);

    if (!show) {
        return null;
    }

    const handleSubmitClick = async () => {
        try {
            if (onDownload) {
                await onDownload(useBrackets);
            } else {
                await downloadTexts(useBrackets);
            }
            onClose();
            addSnackbar({ text: 'Download iniciado com sucesso!', type: 'success' });
        } catch (err) {
            console.error('Download failed:', err);
            addSnackbar({
                text: 'Erro ao realizar o download.',
                type: 'error',
                duration: 5000
            });
        }
    };

    const handleOverlayClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
        setUseBrackets(event.target.checked);
    };

    return (
        <Dialog isOpen={show} onClose={onClose} className="confirmation-dialog">
            <DialogHeader onClose={onClose} icon='Download'>
                Opções de Download
            </DialogHeader>

            <Stack direction="vertical" gap={16} className="dialog-content">
                {'Todos os textos selecionados no filtro serão baixados.'}
                <label className="dialog-checkbox-wrapper" htmlFor="use-brackets-checkbox">
                    <input
                        type="checkbox"
                        id="use-brackets-checkbox"
                        name="use-brackets-checkbox"
                        checked={useBrackets}
                        onChange={handleCheckboxChange}
                    />
                    <span>Substituições com sintaxe XML.</span>
                </label>
            </Stack>

            <Stack alignX="center" gap={12} className="confirmation-buttons">
                <Button tier="secondary" variant="danger" onClick={onClose}>Cancelar</Button>
                <Button
                    tier="primary"
                    variant="action"
                    onClick={() => {
                        void handleSubmitClick();
                    }}
                    disabled={!confirmEnabled}
                >
                    Baixar
                </Button>
            </Stack>
        </Dialog>
    );
}

export default DownloadDialog;