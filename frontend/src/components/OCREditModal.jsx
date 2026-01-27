import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/ocr_modal.css';
import { getRawTextImage, finalizeRawText, updateRawText } from './api/APIFunctions';

const OCREditModal = ({ rawText, onClose, onToggleImage, onFinish }) => {
  const [textContent, setTextContent] = useState('');
  const [imageHidden, setImageHidden] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [processingState, setProcessingState] = useState(null); // null, 'processing', 'success', 'error'
  const [processingMessage, setProcessingMessage] = useState('');
  const [finalFileName, setFinalFileName] = useState('');
  const imageRef = useRef(null);

  useEffect(() => {
    if (rawText) {
      setTextContent(rawText.text_content || '');
      setFinalFileName(rawText.source_file_name || '');
      // Reset zoom and position when text changes
      setZoomLevel(100);
      setImagePosition({ x: 0, y: 0 });

      // Load image
      loadImage();
    }
  }, [rawText]);

  const loadImage = async () => {
    if (rawText?.id) {
      try {
        const url = await getRawTextImage(rawText.id);
        setImageUrl(url);
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setZoomLevel(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  const handleToggleImage = () => {
    setImageHidden(!imageHidden);
    if (onToggleImage) {
      onToggleImage();
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await updateRawText(rawText.id, textContent);
      if (onFinish) {
        onFinish();
      }
      onClose();
    } catch (error) {
      console.error('Error saving text:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmFinalize = async () => {
    setIsFinalizing(true);
    setProcessingState('processing');
    setProcessingMessage('Processando texto, aguarde...');

    try {
      // First save the current content
      await updateRawText(rawText.id, textContent);

      // Then finalize (process and delete) with optional custom filename
      await finalizeRawText(rawText.id, finalFileName);

      setProcessingState('success');
      setProcessingMessage('Texto finalizado com sucesso! Agora está disponível para normalização.');

      // Wait 3 seconds before closing to show success message
      setTimeout(() => {
        if (onFinish) {
          onFinish();
        }
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error finalizing text:', error);
      setProcessingState('error');
      setProcessingMessage('Erro ao finalizar o texto. Tente novamente.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCancelFinalize = () => {
    setShowConfirmModal(false);
  };

  const handleCloseProcessing = () => {
    setShowConfirmModal(false);
    setProcessingState(null);
    setProcessingMessage('');
  };

  const handleTextChange = (e) => {
    setTextContent(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = textContent.substring(0, start) + '\t' + textContent.substring(end);
      setTextContent(newValue);
      // Set cursor position after the tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 1;
      }, 0);
    }
  };

  if (!rawText) return null;

  return (
    <div className="ocr-modal-overlay" onClick={onClose}>
      <div className="ocr-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ocr-modal-header">
          <h2 className="ocr-modal-title">{rawText.source_file_name}</h2>
          <button className="ocr-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Body: Grid layout with image and text */}
        <div className="ocr-modal-body">
          {/* Image Panel */}
          {!imageHidden && (
            <div className="ocr-modal-image-panel">
              <div className="ocr-image-controls">
                <button className="ocr-control-btn" onClick={handleZoomOut}>-</button>
                <span className="ocr-control-hint">{zoomLevel}%</span>
                <button className="ocr-control-btn" onClick={handleZoomIn}>+</button>
                <button className="ocr-control-btn" onClick={handleResetZoom}>Reset</button>
              </div>

              <div
                className="ocr-image-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                {imageUrl ? (
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="OCR Source"
                    className="ocr-modal-image"
                    draggable={false}
                    style={{
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel / 100})`,
                    }}
                  />
                ) : (
                  <div className="ocr-image-placeholder">Loading image...</div>
                )}
              </div>
            </div>
          )}

          {/* Text Panel */}
          <div
            className="ocr-modal-text-panel"
            style={imageHidden ? { gridColumn: '1 / -1' } : {}}
          >
            <div className="ocr-text-toolbar">
              <h3 className="ocr-toolbar-title">Texto Transcrito</h3>
              <div className="ocr-toolbar-actions">
                <button className="ocr-action-btn ocr-btn-secondary" onClick={handleToggleImage}>
                  {imageHidden ? 'Mostrar Imagem' : 'Ocultar Imagem'}
                </button>
                <button
                  className="ocr-action-btn ocr-btn-primary"
                  onClick={handleFinish}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar e Fechar'}
                </button>
                <button
                  className="ocr-action-btn ocr-btn-success"
                  onClick={handleFinalize}
                  disabled={isSaving || isFinalizing}
                >
                  {isFinalizing ? 'Finalizando...' : 'Finalizar'}
                </button>
              </div>
            </div>

            <textarea
              className="ocr-modal-textarea"
              value={textContent}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite o texto transcrito aqui..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Confirmation/Processing Modal */}
      {showConfirmModal && (
        <div className="ocr-confirm-modal-overlay" onClick={processingState ? null : handleCancelFinalize}>
          <div className="ocr-confirm-modal" onClick={(e) => e.stopPropagation()}>
            {!processingState && (
              <>
                <h3>Confirmar Finalização</h3>
                <p>
                  Tem certeza que deseja finalizar este texto?
                  <br />
                  O texto será processado e ficará disponível para normalização.
                  <br />
                  <strong>A versão bruta e a imagem associada serão excluídas.</strong>
                </p>
                <div className="ocr-confirm-filename-group">
                  <label htmlFor="finalFileName">Nome do arquivo final:</label>
                  <input
                    id="finalFileName"
                    type="text"
                    value={finalFileName}
                    onChange={(e) => setFinalFileName(e.target.value)}
                    placeholder="Nome do arquivo"
                    disabled={isFinalizing}
                  />
                </div>
                <div className="ocr-confirm-modal-actions">
                  <button
                    className="ocr-action-btn ocr-btn-secondary"
                    onClick={handleCancelFinalize}
                    disabled={isFinalizing}
                  >
                    Cancelar
                  </button>
                  <button
                    className="ocr-action-btn ocr-btn-danger"
                    onClick={handleConfirmFinalize}
                    disabled={isFinalizing}
                  >
                    {isFinalizing ? 'Finalizando...' : 'Confirmar'}
                  </button>
                </div>
              </>
            )}

            {processingState === 'processing' && (
              <>
                <h3>Processando</h3>
                <div className="ocr-loading-container">
                  <div className="ocr-loading-spinner"></div>
                </div>
                <p className="ocr-processing-text">{processingMessage}</p>
              </>
            )}

            {processingState === 'success' && (
              <>
                <h3>✓ Sucesso</h3>
                <p className="ocr-success-text">{processingMessage}</p>
              </>
            )}

            {processingState === 'error' && (
              <>
                <h3>✗ Erro</h3>
                <p className="ocr-error-text">{processingMessage}</p>
                <div className="ocr-confirm-modal-actions">
                  <button
                    className="ocr-action-btn ocr-btn-primary"
                    onClick={handleCloseProcessing}
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

OCREditModal.propTypes = {
  rawText: PropTypes.shape({
    id: PropTypes.number.isRequired,
    source_file_name: PropTypes.string.isRequired,
    text_content: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onToggleImage: PropTypes.func,
  onFinish: PropTypes.func,
};

export default OCREditModal;
