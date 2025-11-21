import { useState } from 'react';
import PropTypes from 'prop-types';

import '../styles/download_dialog.css'; 
import downloadTexts from './api/download_texts';

/**
 *
 * @param {object} props
 * @param {boolean} props.show 
 * @param {function} props.onClose

 */
function DownloadDialog({ show, onClose }) {
  
  const [useBrackets, setUseBrackets] = useState(false);

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
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      
      <div className="dialog-popup">
        
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

        <div className="dialog-buttons">
          <button 
            className="dialog-button secondary" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="dialog-button primary" 
            onClick={handleSubmitClick}
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
