import { useEffect, useState } from 'react';
import downloadTexts from '../../Api/DownloadTexts';
import { useSnackbar } from '../../Context/Generic';
import { Stack, Button, Checkbox, ModalScaffold } from '../Generic';

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

    return (
        <ModalScaffold
            isOpen={show}
            onClose={onClose}
            title="Opções de Download"
            icon="Download"
            size="sm"
            footer={(
                <>
                    <Button variant="action" onClick={onClose}>Cancelar</Button>
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
                </>
            )}
        >
            <Stack direction="vertical" gap={16}>
                {'Todos os textos selecionados no filtro serão baixados.'}
                <Checkbox
                    id="use-brackets-checkbox"
                    name="use-brackets-checkbox"
                    checked={useBrackets}
                    onChange={(event) => setUseBrackets(event.target.checked)}
                    label="Substituições com sintaxe XML."
                />
            </Stack>
        </ModalScaffold>
    );
}

export default DownloadDialog;