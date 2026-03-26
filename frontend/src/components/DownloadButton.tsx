import '../styles/download_button.css';
import downloadIcon from '../assets/download_button.svg';

interface DownloadButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function DownloadButton({ onClick, disabled = false }: DownloadButtonProps) {
  return (
    <button
      className="download-button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Fazer Download"
    >
      <img src={downloadIcon} alt="Ícone de Download" />
    </button>
  );
}

export default DownloadButton;