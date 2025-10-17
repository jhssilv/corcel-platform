import React, { useState } from 'react';

// 1. Importe o NOVO arquivo CSS
import '../styles/download_dialog.css'; 

/**
 * Componente de diálogo para opções de download (Novo Estilo).
 *
 * @param {object} props
 * @param {boolean} props.show - Controla a visibilidade do diálogo.
 * @param {function} props.onClose - Função para fechar o diálogo.
 * @param {function} props.onDownload - Callback de submit, recebe o estado do checkbox.
 */
function DownloadDialog({ show, onClose, onDownload }) {
  
  const [useBrackets, setUseBrackets] = useState(false);

  if (!show) {
    return null;
  }

  // A LÓGICA DO BOTÃO DE SUBMIT VAI AQUI
  const handleSubmitClick = () => {
    // Esta função é chamada quando "Baixar" é clicado.
    // Ela chama a função 'onDownload' (passada pelo componente pai)
    // e envia o estado atual do checkbox.
    onDownload(useBrackets);
    onClose(); // Fecha o diálogo
  };

  // Fecha ao clicar no fundo
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCheckboxChange = (e) => {
    setUseBrackets(e.target.checked);
  };

  return (
    // 2. Use as NOVAS classes CSS
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
            {/* Usamos &lt; e &gt; para renderizar < e > */}
            <span>Botar substituições entre &lt;&gt;</span>
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