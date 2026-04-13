import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import styles from './drop_zone.module.css';

interface DropZoneRenderState {
    isDragging: boolean;
    openFilePicker: () => void;
}

export interface DropZoneProps {
    onFilesDropped: (files: File[]) => void | Promise<void>;
    children: ReactNode | ((state: DropZoneRenderState) => ReactNode);
    variant?: 'unstyled' | 'panel';
    className?: string;
    draggingClassName?: string;
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    enableClickSelect?: boolean;
}

export function DropZone({
    onFilesDropped,
    children,
    variant = 'unstyled',
    className = '',
    draggingClassName = '',
    accept,
    multiple = true,
    disabled = false,
    enableClickSelect = true,
}: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const openFilePicker = () => {
        if (disabled || !enableClickSelect) return;
        fileInputRef.current?.click();
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        if (disabled) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        if (disabled) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        if (disabled) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files || []);
        if (files.length > 0) {
            void onFilesDropped(files);
        }
    };

    const classes = [
        styles.root,
        variant === 'panel' ? styles.panel : '',
        variant === 'panel' && isDragging ? styles.panelDragging : '',
        className,
        isDragging ? draggingClassName : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={openFilePicker}>
            {enableClickSelect ? (
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple={multiple}
                    accept={accept}
                    onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        if (files.length > 0) {
                            void onFilesDropped(files);
                        }
                        event.target.value = '';
                    }}
                />
            ) : null}
            {typeof children === 'function' ? children({ isDragging, openFilePicker }) : children}
        </div>
    );
}

export default DropZone;
