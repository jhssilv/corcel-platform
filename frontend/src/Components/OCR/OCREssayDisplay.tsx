import { memo, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import '../../styles/ocr_essay_display.css';
import { getRawTextImage } from '../../Api';
import type { RawTextDetail } from '../../types';

interface OCREssayDisplayProps {
    essay: RawTextDetail | null;
    imageVisible: boolean;
    text: string;
    onTextChange: (value: string) => void;
}

interface ImagePanelProps {
    imageUrl: string | null;
    imageVisible: boolean;
}

interface TextPanelProps {
    text: string;
    onTextChange: (value: string) => void;
}

interface Point {
    x: number;
    y: number;
}

const ImagePanel = memo(({ imageUrl, imageVisible }: ImagePanelProps) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            const delta = event.deltaY * -0.001;
            setScale((previous) => Math.min(Math.max(0.1, previous + delta), 5));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const startDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
        setDragStart({ x: event.clientX - position.x, y: event.clientY - position.y });
    };

    const onDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!isDragging) {
            return;
        }

        event.preventDefault();
        setPosition({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y });
    };

    const stopDrag = () => {
        setIsDragging(false);
    };

    if (!imageVisible) {
        return null;
    }

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
                    <p style={{ color: '#666', marginBottom: '10px' }}>Imagem não disponível</p>
                </div>
            )}
        </div>
    );
});

ImagePanel.displayName = 'ImagePanel';

const TextPanel = memo(({ text, onTextChange }: TextPanelProps) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Tab') {
            return;
        }

        event.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) {
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = `${text.substring(0, start)}\t${text.substring(end)}`;

        onTextChange(newValue);

        requestAnimationFrame(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = start + 1;
                textareaRef.current.selectionEnd = start + 1;
            }
        });
    };

    return (
        <textarea
            ref={textareaRef}
            className="ocr-textarea"
            value={text}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onTextChange(event.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
        />
    );
});

TextPanel.displayName = 'TextPanel';

function OCREssayDisplay({ essay, imageVisible, text, onTextChange }: OCREssayDisplayProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        let createdUrl: string | null = null;

        const loadImage = async () => {
            if (!essay?.id) {
                setImageUrl(null);
                return;
            }

            try {
                const url = await getRawTextImage(essay.id);
                createdUrl = url;
                if (mounted) {
                    setImageUrl(url);
                }
            } catch (error) {
                console.error(error);
            }
        };

        void loadImage();

        return () => {
            mounted = false;
            if (createdUrl) {
                URL.revokeObjectURL(createdUrl);
            }
        };
    }, [essay]);

    if (!essay) {
        return (
            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                }}
            >
                <h3>Selecione um texto no menu acima para começar</h3>
            </div>
        );
    }

    return (
        <div className="ocr-container">
            <div className="ocr-text-area">
                <TextPanel text={text} onTextChange={onTextChange} />
            </div>

            {imageVisible && <ImagePanel imageUrl={imageUrl} imageVisible={imageVisible} />}
        </div>
    );
}

export default OCREssayDisplay;