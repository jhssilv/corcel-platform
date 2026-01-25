import PropTypes from 'prop-types';
import '../styles/ocr_toolbar.css';

function OCRToolbar({ imageVisible, onToggleImage, onFinish }) {
    return (
        <div className="ocr-toolbar">
            <div className="ocr-toolbar-left">
                <button 
                    className="ocr-toolbar-btn toggle-btn" 
                    onClick={onToggleImage}
                >
                    {imageVisible ? 'Ocultar Imagem' : 'Mostrar Imagem'}
                </button>
            </div>
            
            <div className="ocr-toolbar-right">
                <button
                    className="ocr-toolbar-btn finish-btn"
                    onClick={onFinish}
                >
                    Terminar
                </button>
            </div>
        </div>
    );
}

OCRToolbar.propTypes = {
    imageVisible: PropTypes.bool.isRequired,
    onToggleImage: PropTypes.func.isRequired,
    onFinish: PropTypes.func.isRequired
};

export default OCRToolbar;
