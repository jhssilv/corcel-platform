import { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import '../styles/ocr_essay_display.css';
import { getTextImage, updateToken, getRawTextImage } from './api/APIFunctions'; 

const ImagePanel = memo(({ imageUrl, imageVisible }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
             e.preventDefault();
             const delta = e.deltaY * -0.001;
             setScale(prev => Math.min(Math.max(0.1, prev + delta), 5));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const startDrag = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const onDrag = (e) => {
        if (isDragging) {
            e.preventDefault();
            setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const stopDrag = () => {
        setIsDragging(false);
    };

    if (!imageVisible) return null;

    return (
        <div 
            ref={containerRef}
            className="ocr-image-area" 
            onMouseDown={startDrag} 
            onMouseMove={onDrag} 
            onMouseUp={stopDrag} 
            onMouseLeave={stopDrag}
            style={{ overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
        >
             {imageUrl ? (
                 <img 
                    src={imageUrl} 
                    className="ocr-image" 
                    style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
                    draggable="false"
                    alt="Essay Source"
                 />
             ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{color: '#666', marginBottom: '10px'}}>Imagem não disponível</p>
                 </div>
             )}
        </div>
    );
});

ImagePanel.displayName = 'ImagePanel';
ImagePanel.propTypes = {
    imageUrl: PropTypes.string,
    imageVisible: PropTypes.bool
};

const TextPanel = memo(({ text, onTextChange }) => {
    const textareaRef = useRef(null);

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            const newValue = text.substring(0, start) + "\t" + text.substring(end);
            
            // We need to pass the change up
            onTextChange(newValue);

            // Restore cursor position after state update
            // We use requestAnimationFrame or setTimeout to run after render
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
                }
            });
        }
    };

    return (
        <textarea
            ref={textareaRef}
            className="ocr-textarea"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
        />
    );
});

TextPanel.displayName = 'TextPanel';
TextPanel.propTypes = {
    text: PropTypes.string,
    onTextChange: PropTypes.func
};

function OCREssayDisplay({ essay, imageVisible, text, onTextChange }) {
    const [imageUrl, setImageUrl] = useState(null);

    useEffect(() => {
        if (essay?.id) {
             getRawTextImage(essay.id).then(url => setImageUrl(url)).catch(console.error); 
        } else {
            setImageUrl(null);
        }
    }, [essay]);

    if (!essay) {
        return (
            <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#666' 
            }}>
                <h3>Selecione um texto no menu acima para começar</h3>
            </div>
        );
    }

    return (
        <div className="ocr-container">
            {/* Text Area: Flex 1 */}
            <div className="ocr-text-area">
                <TextPanel text={text} onTextChange={onTextChange} />
            </div>

            {/* Image Area: Flex 1 (only if visible) */}
            {imageVisible && (
                <ImagePanel imageUrl={imageUrl} imageVisible={imageVisible} />
            )}
        </div>
    );
}

OCREssayDisplay.propTypes = {
    essay: PropTypes.object,
    imageVisible: PropTypes.bool,
    text: PropTypes.string,
    onTextChange: PropTypes.func
};

export default OCREssayDisplay;
