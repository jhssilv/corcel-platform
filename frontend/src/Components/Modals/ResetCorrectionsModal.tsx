import { Dialog, DialogHeader, Stack, Button, DialogFooter } from '../Generic';

interface ResetCorrectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
}

export default function ResetCorrectionsModal({ isOpen, onClose, onConfirm }: ResetCorrectionsModalProps) {
    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} style={{ maxWidth: '450px' }}>
            <DialogHeader onClose={onClose} icon="TriangleAlert">
                Excluir Normalizações
            </DialogHeader>

            <Stack direction="vertical" gap={16} style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                <p style={{ margin: 0, color: 'var(--color-text-on-panel)' }}>
                    Tem certeza de que deseja excluir todas as normalizações para este texto? 
                    Esta ação não pode ser desfeita.
                </p>
            </Stack>

            <DialogFooter align="right">
                <Button tier="secondary" variant="neutral" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    tier="primary"
                    variant="danger"
                    onClick={() => {
                        void handleConfirm();
                    }}
                >
                    Excluir
                </Button>
            </DialogFooter>
        </Dialog>
    );
}