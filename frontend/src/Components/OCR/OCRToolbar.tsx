import '../../styles/ocr_toolbar.css';

interface OCRToolbarProps {
    imageVisible: boolean;
    onToggleImage: () => void;
    onFinish: () => void;
}

function OCRToolbar({ imageVisible, onToggleImage, onFinish }: OCRToolbarProps) {
    return (
        <div className="ocr-toolbar">
            <div className="ocr-toolbar-left">
                <button className="ocr-toolbar-btn toggle-btn" onClick={onToggleImage}>
                    {imageVisible ? 'Ocultar Imagem' : 'Mostrar Imagem'}
                </button>
            </div>

            <div className="ocr-toolbar-right">
                <button className="ocr-toolbar-btn finish-btn" onClick={onFinish}>
                    Terminar
                </button>
            </div>
        </div>
    );
}

export default OCRToolbar;