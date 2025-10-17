import React from 'react';
import '../styles/download_button.css'; // Vamos usar este novo CSS

// 1. Importe o SVG como um recurso
// O caminho deve ser relativo a *este* arquivo .jsx
import downloadIcon from '../assets/download_button.svg';

/**
 * Um botão de ícone (SVG) para download.
 *
 * @param {object} props
 * @param {function} props.onClick - A função a ser chamada quando o botão é clicado.
 * @param {boolean} [props.disabled] - Opcional: desativa o botão.
 */
function DownloadButton({ onClick, disabled = false }) {
  return (
    <button 
      className="download-button" 
      onClick={onClick}
      disabled={disabled}
      aria-label="Fazer Download" // <-- MUITO IMPORTANTE para acessibilidade
    >
      <img 
        src={downloadIcon} 
        alt="Ícone de Download" 
      />
    </button>
  );
}

export default DownloadButton;