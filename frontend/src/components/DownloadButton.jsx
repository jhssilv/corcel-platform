import PropTypes from 'prop-types';

import '../styles/download_button.css'; 
import downloadIcon from '../assets/download_button.svg';

/**
 * An download button component.
 *
 * @param {object} props
 * @param {function} props.onClick 
 * @param {boolean} [props.disabled] 
 */
function DownloadButton({ onClick, disabled = false }) {
  return (
    <button 
      className="download-button" 
      onClick={onClick}
      disabled={disabled}
      aria-label="Fazer Download"
    >
      <img 
        src={downloadIcon} 
        alt="Ícone de Download" 
      />
    </button>
  );
}

DownloadButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default DownloadButton;