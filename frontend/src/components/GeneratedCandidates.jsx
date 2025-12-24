import PropTypes from 'prop-types';
import { useRef, useEffect, useState } from 'react';
import FloatingCandidatesList from './FloatingCandidatesList';
import CandidatesSidePanel from './CandidatesSidePanel';
import { postNormalization, deleteNormalization } from './api/APIFunctions';

const GeneratedCandidates = ({ 
    candidates, 
    selectedStartIndex, 
    selectedEndIndex, 
    setSelectedCandidate, 
    setPopupIsActive,
    selectedTokenText,
    singleWordSelected,
    toBeNormalized,
    refreshEssay,
    suggestForAll,
    setSuggestForAll,
    onClose,
    tokenId,
    tokenPosition,
    lastClickTime,
    essayId
}) => {

    const floatingListRef = useRef(null);
    const sidePanelRef = useRef(null);
    const [showFloatingList, setShowFloatingList] = useState(true);

    useEffect(() => {
        setSuggestForAll(false);
    }, [selectedStartIndex, setSuggestForAll]);

    useEffect(() => {
        setShowFloatingList(true);
    }, [selectedStartIndex, lastClickTime]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideFloating = floatingListRef.current && floatingListRef.current.contains(event.target);
            const isInsidePanel = sidePanelRef.current && sidePanelRef.current.contains(event.target);

            if (isInsideFloating) return;

            if (isInsidePanel) {
                if (!event.target.closest('.global-suggestion-label')) {
                    setShowFloatingList(false);
                }
                return;
            }
            
            // Clicked outside both
            if (
                event.target.classList.contains('clickable') ||
                event.target.closest('.confirmation-dialog') ||
                event.target.closest('.confirmation-overlay')
            ) {
                    return;
            }

            if (showFloatingList && candidates && candidates.length > 0) {
                setShowFloatingList(false);
            } else {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, showFloatingList, candidates]);

    if(selectedStartIndex == null)
        return null;

    const handleCandidateSelection = async (candidate) => {     
        setSelectedCandidate(candidate);
        
        if (suggestForAll) {
            setPopupIsActive(true);
        } else {
            if(!candidate) await deleteNormalization(essayId, selectedStartIndex);
            else           await postNormalization(essayId, selectedStartIndex, selectedEndIndex, candidate, suggestForAll);
            
            refreshEssay();
            setSelectedCandidate(null);
        }
    };

    const hasCandidates = candidates && candidates.length > 0;

    return (
        <>
            {singleWordSelected && showFloatingList && (
                <FloatingCandidatesList 
                    candidates={candidates}
                    tokenPosition={tokenPosition}
                    onSelect={handleCandidateSelection}
                    onClose={() => setShowFloatingList(false)}
                    forwardRef={floatingListRef}
                />
            )}

            <CandidatesSidePanel 
                selectedTokenText={selectedTokenText}
                singleWordSelected={singleWordSelected}
                toBeNormalized={toBeNormalized}
                refreshEssay={refreshEssay}
                suggestForAll={suggestForAll}
                setSuggestForAll={setSuggestForAll}
                onClose={onClose}
                tokenId={tokenId}
                onSelectCandidate={handleCandidateSelection}
                forwardRef={sidePanelRef}
                hasCandidates={hasCandidates}
            />
        </>
    );
};

GeneratedCandidates.propTypes = {
    candidates: PropTypes.array,
    selectedStartIndex: PropTypes.number,
    selectedEndIndex: PropTypes.number,
    setSelectedCandidate: PropTypes.func,
    setPopupIsActive: PropTypes.func,
    selectedTokenText: PropTypes.string,
    singleWordSelected: PropTypes.bool,
    toBeNormalized: PropTypes.bool,
    refreshEssay: PropTypes.func,
    suggestForAll: PropTypes.bool,
    setSuggestForAll: PropTypes.func,
    onClose: PropTypes.func,
    tokenId: PropTypes.number,
    tokenPosition: PropTypes.object,
    lastClickTime: PropTypes.number,
    essayId: PropTypes.number
};

export default GeneratedCandidates;
