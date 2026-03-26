import { useEffect, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import '../styles/download_dialog.css';
import downloadTexts from './api/DownloadTexts';

interface DownloadDialogProps {
  show: boolean;
  onClose: () => void;
  onDownload?: (useBrackets: boolean) => Promise<unknown> | void;
}

function DownloadDialog({ show, onClose, onDownload }: DownloadDialogProps) {
  const [useBrackets, setUseBrackets] = useState(false);
  const [confirmEnabled, setConfirmEnabled] = useState(false);

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
    if (onDownload) {
      await onDownload(useBrackets);
    } else {
      await downloadTexts(useBrackets);
    }

    onClose();
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
    <div className="confirmation-overlay" onClick={handleOverlayClick}>
      <div className="confirmation-dialog">
        <h2 className="dialog-title">Opções de Download</h2>

        <div className="dialog-content">
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
        </div>

        <div className="confirmation-buttons">
          <button className="cancel-btn" onClick={onClose}>Cancelar</button>
          <button
            className="confirm-btn"
            onClick={() => {
              void handleSubmitClick();
            }}
            disabled={!confirmEnabled}
          >
            Baixar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DownloadDialog;