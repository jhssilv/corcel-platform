import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import buildText from './functions/BuildText';
import '../styles/generated_essay.css';

// Generates the essay: every word must be clickable (wrapped in a span), whilst maintaining
// blank spaces and punctuations.
// Also adds classes for word highlights

const GeneratedEssay = ({ essay, selectedStartIndex, setSelectedStartIndex, selectedEndIndex, setSelectedEndIndex, setTokenPosition, setLastClickTime }) => {
    
    const [ctrlPressed, setCtrlPressed] = useState(false);
    const [animatedIndices, setAnimatedIndices] = useState(new Set());
    const [animationNonceByIndex, setAnimationNonceByIndex] = useState({});
    const previousCorrectionsRef = useRef({});
    const animationTimeoutsRef = useRef({});
    
    addEventListener('keydown', (event) => {
        if(event.key === "Control")
            setCtrlPressed(true);
    });
    
    addEventListener('keyup', (event) => {
        if(event.key === "Control")
            setCtrlPressed(false);
    });

    useEffect(() => {
        const previousCorrections = previousCorrectionsRef.current || {};
        const currentCorrections = essay?.corrections || {};
        const changedIndices = new Set();

        const addRange = (start, end) => {
            const safeStart = Number(start);
            const safeEnd = Number(end ?? start);
            const from = Math.min(safeStart, safeEnd);
            const to = Math.max(safeStart, safeEnd);
            for (let i = from; i <= to; i++) {
                changedIndices.add(i);
            }
        };

        Object.keys(currentCorrections).forEach((key) => {
            const index = Number(key);
            const previous = previousCorrections[key];
            const current = currentCorrections[key];

            if (!previous || previous.last_index !== current.last_index || previous.new_token !== current.new_token) {
                addRange(index, current?.last_index);
            }
        });

        Object.keys(previousCorrections).forEach((key) => {
            if (!currentCorrections[key]) {
                const previous = previousCorrections[key];
                addRange(key, previous?.last_index);
            }
        });

        if (changedIndices.size > 0) {
            setAnimatedIndices((prev) => {
                const next = new Set(prev);
                changedIndices.forEach((index) => next.add(index));
                return next;
            });

            setAnimationNonceByIndex((prev) => {
                const next = { ...prev };
                changedIndices.forEach((index) => {
                    next[index] = (next[index] || 0) + 1;
                });
                return next;
            });

            changedIndices.forEach((index) => {
                if (animationTimeoutsRef.current[index]) {
                    clearTimeout(animationTimeoutsRef.current[index]);
                }
                animationTimeoutsRef.current[index] = setTimeout(() => {
                    setAnimatedIndices((prev) => {
                        const next = new Set(prev);
                        next.delete(index);
                        return next;
                    });
                }, 850);
            });
        }

        previousCorrectionsRef.current = currentCorrections;
    }, [essay?.corrections]);

    useEffect(() => {
        return () => {
            Object.values(animationTimeoutsRef.current).forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
        };
    }, []);

    const handleSelectedWordIndex = (selectedOption, event) => {
        if (event && event.target) {
            const rect = event.target.getBoundingClientRect();
            setTokenPosition({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                height: rect.height,
                width: rect.width
            });
        }

        // ctrl is pressed but there is no first index selected
        if(ctrlPressed) {
            if(selectedStartIndex == null){
                setSelectedStartIndex(selectedOption);
            }
        // ctrl is pressed and there is already a first index selected
            else{
                selectedOption < selectedStartIndex ?
                setSelectedStartIndex(selectedOption) : 
                setSelectedEndIndex(selectedOption);
            }
        }
        // ctrl is not pressed, just select the word
        else{
            setSelectedStartIndex(selectedOption);
            setSelectedEndIndex(selectedOption);
            if (setLastClickTime) setLastClickTime(Date.now());
        }
    };

    const spans = buildText(essay, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex, animatedIndices, animationNonceByIndex);

    return (
        <div className="essay-container">
            <div className="document-header">
                <span className="document-title">{essay.sourceFileName}</span>
                {essay.grade !== undefined && essay.grade !== null && (
                    <span className="document-grade">Nota: {essay.grade}</span>
                )}
            </div>
            <div className="document-body">
                {spans}
            </div>
        </div>
    );
};

GeneratedEssay.propTypes = {
    essay: PropTypes.object,
    selectedStartIndex: PropTypes.number,
    setSelectedStartIndex: PropTypes.func,
    selectedEndIndex: PropTypes.number,
    setSelectedEndIndex: PropTypes.func,
    setTokenPosition: PropTypes.func,
    setLastClickTime: PropTypes.func
};

export default GeneratedEssay;