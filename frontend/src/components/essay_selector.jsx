import { useState, useEffect } from 'react';

import DropdownSelect from './dropdown_select.jsx';
import PropTypes from 'prop-types';

// ESSAY SELECTOR COMPONENT \\

// Returns two dropdowns for selecting the essay
// 1. essay id selector
// 2. grade filter (filters the essay ids in the 1st dropdown)

const gradeOptions = [
    { value: 0, label: 'Nota 0' },
    { value: 1, label: 'Nota 1' },
    { value: 2, label: 'Nota 2' },
    { value: 3, label: 'Nota 3' },
    { value: 4, label: 'Nota 4' },
    { value: 5, label: 'Nota 5' },
];

const teachers = [
    { value: 'Amanda', label: 'Amanda' },
    { value: 'Brenda', label: 'Brenda' },
    { value: 'Isabel', label: 'Isabel' },
    { value: 'Isadora', label: 'Isadora' },
    { value: 'Luiza', label: 'Luiza' },
    { value: 'Elisa', label: 'Elisa' },
    { value: 'Marine', label: 'Marine' },
    { value: 'Deise', label: 'Deise' },
    { value: 'Fernanda', label: 'Fernanda' },
    { value: 'Tanara', label: 'Tanara' },
    { value: 'Larissa', label: 'Larissa' },
];

const otherFilters = [
    { value: true, label: 'Corrigido'},
    { value: false, label: 'Não corrigido'}
];

const EssaySelector = ({
    selectedEssay,
    setSelectedEssay,
}) => {
    const [essayIndexes, setEssayIndexes] = useState(null);
    const [selectedGrades, setSelectedGrades] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedOtherFilters, setSelectedOtherFilters] = useState(null);
    const [filteredEssays, setFilteredEssays] = useState(null);

    // <> Event handlers <> \\
    // <> Event handlers <> \\
    useEffect(() => {
        const data = localStorage.getItem('essayIndexes');
        if (data) {
            const parsedData = JSON.parse(data);
            setEssayIndexes(parsedData);
            changeFilteredEssays(parsedData,null);
        }
    }, []);

    if (!essayIndexes) {
        return <p>Carregando dados...</p>;
    }
        
    function changeFilteredEssays(essayIndexes, selectedGrades, selectedTeacher, selectedOtherFilters) {
        // Extract selected grade values (numbers)
        const selectedGradesList = selectedGrades?.map(item => item.value) || [];
        
        // Extract selected teacher values (strings) - now expecting an array since isMulti=true
        const selectedTeacherList = selectedTeacher?.map(item => item.value) || [];
        
        // Extract other filters values (strings)
        const selectedOtherFiltersList = selectedOtherFilters?.map(item => item.value) || [];
      
        const filteredEssays = essayIndexes
            .filter(([, grade, teacher, isCorrected]) => {
                const matchesGrade =
                selectedGradesList.length === 0 || selectedGradesList.includes(Number(grade));
                const matchesTeacher =
                selectedTeacherList.length === 0 || selectedTeacherList.includes(teacher);
                const matchesCorrected = 
                selectedOtherFiltersList.length === 0 || selectedOtherFiltersList.includes(isCorrected);
      
                return matchesGrade && matchesTeacher && matchesCorrected;
          })
            .map(([id]) => ({ value: id, label: id }));
        
        setFilteredEssays(filteredEssays);
    }

    
    const handleCorrectionChange = async (checked) => {
        const payload = { 
            essay_id: selectedEssay.value,  // Confirm this matches your backend expectation
            correctionStatus: checked 
        };
        
        try {
            const response = await fetch('/api/changeCorrectionStatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.message || 'Failed to update');
        
            // Update essayIndexes
            const updatedIndexes = essayIndexes.map(essay => {
                if (essay[0] === selectedEssay.value) {
                  return [essay[0], essay[1], essay[2], checked];
                }
                return essay;
            });

            setEssayIndexes(updatedIndexes);
            changeFilteredEssays(updatedIndexes, selectedGrades, selectedTeacher, selectedOtherFilters);
        
            } catch (error) {
                console.error('Error:', error);
            }
        };

    // Handlers for dropdown changes
    const handleOtherFiltersChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedOtherFilters(selectedOptions);

        // Resets the filters
        changeFilteredEssays(essayIndexes, selectedGrades, selectedTeacher, selectedOptions);
    };

    const handleTeacherChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedTeacher(selectedOptions);

        // Resets the filters
        changeFilteredEssays(essayIndexes, selectedGrades, selectedOptions, selectedOtherFilters);
    };

    const handleGradeChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedGrades(selectedOptions);

        // Resets the filters
        changeFilteredEssays(essayIndexes, selectedOptions, selectedTeacher, selectedOtherFilters);
    };

    const handleEssayChange = (selectedOption) => {
        setSelectedEssay(selectedOption);
    };

    return (
        <form>
            {/* Essay Dropdown */}
            <DropdownSelect
                title="ID do Texto"
                options={filteredEssays}
                selectedValues={selectedEssay}
                onChange={handleEssayChange}
                isMulti={false}
            />
            {/* Grade Dropdown */}
            <DropdownSelect
                title="Notas"
                options={gradeOptions}
                selectedValues={selectedGrades}
                onChange={handleGradeChange}
                isMulti={true}
            />
            {/* Teachers Dropdown */}
            <DropdownSelect
                title="Responsável"
                options={teachers}
                selectedValues={selectedTeacher}
                onChange={handleTeacherChange}
                isMulti={true}
            />
            {/* Corrected Dropdown */}
            <DropdownSelect
                title="Outros filtros"
                options={otherFilters}
                selectedValues={selectedOtherFilters}
                onChange={handleOtherFiltersChange}
                isMulti={true}
            />
            {/* Checkbox to mark the essay as corrected */}
            {selectedEssay && (
            <div className="checkbox-external-wrapper">
                <div className="checkbox-wrapper-47">
                <input
                    type="checkbox" 
                    name="cb" 
                    id="cb-47"
                    checked={essayIndexes.find((e) => e[0] === selectedEssay.value)?.[3] || false}
                    onChange={(e) => handleCorrectionChange(e.target.checked)}
                />
                <label htmlFor="cb-47">Corrigido?</label>
                </div>
            </div>
            )}
            {/* Corrected texts count */}
            <div id="correctedCount">
                Corrigidos: {filteredEssays.length} / {
                    essayIndexes
                        .filter(([ essay_id, , , iscorrected ]) => 
                            iscorrected === true && 
                            filteredEssays.some((essay) => essay.value === essay_id)
                        ).length
                }
            </div>
        </form>
    )
}

EssaySelector.propTypes = {
    selectedEssay: PropTypes.object,
    setSelectedEssay: PropTypes.func,
};

export default EssaySelector;