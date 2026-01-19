import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import '../styles/candidates_side_panel.css';
import { toggleToBeNormalized } from './api/APIFunctions';

const CandidatesSidePanel = ({
    selectedTokenText,
    singleWordSelected,
    toBeNormalized,
    refreshEssay,
    suggestForAll,
    setSuggestForAll,
    onClose,
    tokenId,
    onSelectCandidate,
    forwardRef,
    hasCandidates
}) => {
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const inputRef = useRef(null);
    const panelRef = useRef(null);
    const dragStateRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
    const [panelPosition, setPanelPosition] = useState(() => {
        try {
            const raw = localStorage.getItem('candidatesPanelPosition');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        const handleMouseMove = (event) => {
            if (!dragStateRef.current.dragging || !panelRef.current) return;

            const panelRect = panelRef.current.getBoundingClientRect();
            const panelWidth = panelRect.width;
            const panelHeight = panelRect.height;

            const nextLeft = event.clientX - dragStateRef.current.offsetX;
            const nextTop = event.clientY - dragStateRef.current.offsetY;

            const minLeft = 8;
            const minTop = 68;
            const maxLeft = Math.max(minLeft, window.innerWidth - panelWidth - 8);
            const maxTop = Math.max(minTop, window.innerHeight - panelHeight - 8);

            const clampedLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);
            const clampedTop = Math.min(Math.max(nextTop, minTop), maxTop);

            setPanelPosition({ left: clampedLeft, top: clampedTop });
        };

        const handleMouseUp = () => {
            if (dragStateRef.current.dragging) {
                dragStateRef.current.dragging = false;
                if (panelPosition) {
                    localStorage.setItem('candidatesPanelPosition', JSON.stringify(panelPosition));
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [panelPosition]);

    const handleDragStart = (event) => {
        if (!panelRef.current) return;
        const panelRect = panelRef.current.getBoundingClientRect();
        dragStateRef.current = {
            dragging: true,
            offsetX: event.clientX - panelRect.left,
            offsetY: event.clientY - panelRect.top,
        };
    };

    const handleConfirmRemove = async () => {
        await toggleToBeNormalized(tokenId);
        refreshEssay();
        setShowRemoveConfirmation(false);
    };

    return (
        <div
            className="candidates-panel"
            ref={(node) => {
                panelRef.current = node;
                if (typeof forwardRef === 'function') {
                    forwardRef(node);
                } else if (forwardRef) {
                    forwardRef.current = node;
                }
            }}
            style={{
                top: panelPosition?.top ?? 150,
                left: panelPosition?.left ?? 'auto',
                right: panelPosition?.left == null ? 20 : 'auto'
            }}
        >
            <button className="close-panel-button" onClick={onClose} title="Fechar painel">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
            </button>
            <div className="candidates-header" onMouseDown={handleDragStart}>
                {hasCandidates && singleWordSelected ? 'Alternativas para ' : 'Substituir '}
                <span className="selected-token">"{selectedTokenText}"</span>
            </div>
            
            <div className="panel-footer">
                <div className="new-candidate-container">
                    <input
                        ref={inputRef}
                        placeholder="Novo Token"
                        className="new-candidate-input"
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onSelectCandidate(event.target.value); 
                                event.target.blur();
                                event.target.value = '';
                            }
                        }}
                    />
                    <button 
                        className='action-button edit-button' 
                        title="Substituir Token"
                        onClick={(event) => {
                            const inputElement = event.target.previousElementSibling;
                            onSelectCandidate(inputElement.value);
                            inputElement.value = '';
                        }}
                    > 
                        &#128393; 
                    </button>
                    <button 
                        className='action-button delete-button' 
                        title="Remover Substituição"
                        onClick={() => { 
                            onSelectCandidate('');
                        }}
                    > 
                        &#128465; 
                    </button>
                    <button 
                        className={`action-button remove-suggestions-button ${!toBeNormalized ? 'active-green' : ''}`}
                        title="Remover Marcação de Não Normalizado"
                        onClick={() => setShowRemoveConfirmation(true)}
                    > 
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                        </svg>
                    </button>
                </div>
                
                <div className="global-suggestion-container">
                    <label className="global-suggestion-label">
                        <input 
                            type="checkbox" 
                            checked={suggestForAll} 
                            onChange={(e) => setSuggestForAll(e.target.checked)} 
                        />
                        Sugestão Global
                    </label>
                    <div className="info-tooltip-container">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="info-icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <div className="tooltip-text">
                            Ao marcar esta opção, o novo token será sugerida para todas as ocorrências deste token nos textos.
                        </div>
                    </div>
                </div>
            </div>

            {showRemoveConfirmation && (
                <div className="confirmation-overlay">
                    <div className="confirmation-dialog">
                        <p>Marcar token como (in)correto? Isso apenas removerá ou adicionará a marcação de "Não Normalizado"</p>
                        <div className="confirmation-buttons">
                            <button onClick={handleConfirmRemove} className="confirm-btn">Confirmar</button>
                            <button onClick={() => setShowRemoveConfirmation(false)} className="cancel-btn">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

CandidatesSidePanel.propTypes = {
    selectedTokenText: PropTypes.string,
    singleWordSelected: PropTypes.bool,
    toBeNormalized: PropTypes.bool,
    refreshEssay: PropTypes.func,
    suggestForAll: PropTypes.bool,
    setSuggestForAll: PropTypes.func,
    onClose: PropTypes.func,
    tokenId: PropTypes.number,
    onSelectCandidate: PropTypes.func,
    forwardRef: PropTypes.object,
    hasCandidates: PropTypes.bool
};

export default CandidatesSidePanel;
