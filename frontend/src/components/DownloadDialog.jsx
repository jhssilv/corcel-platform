import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import '../styles/download_dialog.css'; 
import downloadTexts from './api/DownloadTexts';

/**
 *
 * @param {object} props
 * @param {boolean} props.show 
 * @param {function} props.onClose

 */
function DownloadDialog({ show, onClose }) {
  
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

  const handleSubmitClick = () => {
    downloadTexts(useBrackets);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCheckboxChange = (e) => {
    setUseBrackets(e.target.checked);
  };

  return (
    <div className="confirmation-overlay" onClick={handleOverlayClick}>
      
      <div className="confirmation-dialog">
        
        <h2 className="dialog-title">
          Opções de Download
        </h2>

        <div className="dialog-content">
          {"Todos os textos selecionados no filtro serão baixados."}
          <label className="dialog-checkbox-wrapper" htmlFor="use-brackets-checkbox">
            <input 
              type="checkbox" 
              id="use-brackets-checkbox" 
              name="use-brackets-checkbox"
              checked={useBrackets}
              onChange={handleCheckboxChange}
            />
            {}
            <span>Substituições com sintaxe XML.</span>
          </label>
        </div>

        <div className="confirmation-buttons">
          <button 
            className="cancel-btn" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="confirm-btn" 
            onClick={handleSubmitClick}
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

DownloadDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func,
};
