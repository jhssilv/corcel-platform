import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { requestReport } from './api/APIFunctions';

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
    } catch (error) {
      const typedError = error as ApiErrorShape;
      alert(typedError.error || 'Houve um erro ao gerar o relatório.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Gerar Relatório</h2>
          <button className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="report-text">
            Gerar relatório para os <b>{textCount}</b> textos <b>filtrados</b>?
          </p>
        </div>

        <div className="modal-footer">
          <button className="modal-button cancel-button" onClick={onClose}>Cancelar</button>
          <button
            className="modal-button confirm-button report-confirm"
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