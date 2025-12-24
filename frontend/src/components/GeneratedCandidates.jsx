import PropTypes from 'prop-types';
import { useRef, useEffect } from 'react';
import FloatingCandidatesList from './FloatingCandidatesList';
import CandidatesSidePanel from './CandidatesSidePanel';

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
    tokenPosition
}) => {

    const floatingListRef = useRef(null);
    const sidePanelRef = useRef(null);

    useEffect(() => {
        setSuggestForAll(false);
    }, [selectedStartIndex, setSuggestForAll]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside floating list AND outside side panel
            const clickedOutsideFloating = floatingListRef.current && !floatingListRef.current.contains(event.target);
            const clickedOutsidePanel = sidePanelRef.current && !sidePanelRef.current.contains(event.target);
            
            if (clickedOutsideFloating && clickedOutsidePanel) {
                // Check if the click target is not a token (class 'clickable')
                // AND not inside the confirmation popup (which might be rendered by a sibling component)
                if (
                    !event.target.classList.contains('clickable') &&
                    !event.target.closest('.confirmation-dialog') &&
                    !event.target.closest('.confirmation-overlay')
                ) {
                     onClose();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if(selectedStartIndex == null)
        return null;

    const handleCandidateSelection = (candidate) => {     
        setSelectedCandidate(candidate);
        setPopupIsActive(true);
    };

    const hasCandidates = candidates && candidates.length > 0;

    return (
        <>
            {singleWordSelected && (
                <FloatingCandidatesList 
                    candidates={candidates}
                    tokenPosition={tokenPosition}
                    onSelect={handleCandidateSelection}
                    onClose={onClose}
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
    tokenPosition: PropTypes.object
};

export default GeneratedCandidates;
