import { useState, useEffect } from 'react';
import DropdownSelect from './DropdownSelect.jsx';
import PropTypes from 'prop-types';
import '../styles/essay_selector.css';

import { getTextsData, getUsernames, toggleNormalizedStatus } from './api/APIFunctions.jsx';

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

const otherFilters = [
    { value: true, label: 'Corrigido' },
    { value: false, label: 'Não corrigido' }
];

const EssaySelector = ({
    selectedEssay,
    setSelectedEssay,
}) => {
    const [textsData, setTextsData] = useState(null);
    const [selectedGrades, setSelectedGrades] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedOtherFilters, setSelectedOtherFilters] = useState(null);
    const [filteredEssays, setFilteredEssays] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [essayInputValue, setEssayInputValue] = useState('');

    // <> Event handlers <> \\
    useEffect(() => {
        // Carrega usernames
        const fetchUsernames = async () => {
            const usernames_data = await getUsernames();
            const usernames = usernames_data.usernames || [];
            const teacherOptions = usernames.map(u => ({ value: u, label: u }));
            setTeachers(teacherOptions);
        };
        fetchUsernames();

        const fetchTexts = async () => {
            try {
                const data = await getTextsData();
                setTextsData(data);
                changeFilteredEssays(data, null, null, null, '');
            } catch (error) {
                console.error("Failed to fetch texts data:", error);
            }
        };
        fetchTexts();
    }, []);

    const fuzzySearchLogic = (candidate, input) => {
        if (!input) return true;

        // regex: 2015n4 -> /2.*0.*1.*5.*n.*4/i
        const pattern = input
            .split(' ')
            .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*');
        
        const regex = new RegExp(pattern, 'i');
        
        return regex.test(candidate.label);
    };

    if (!textsData) {
        return <p>Carregando dados...</p>;
    }

    

    function changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOtherFilters, searchText = '') {

        // Extract selected grade values (numbers)
        const selectedGradesList = selectedGrades?.map(item => item.value) || [];

        // Extract selected teacher values (strings) - now expecting an array since isMulti=true
        const selectedTeacherList = selectedTeacher?.map(item => item.value) || [];

        // Extract other filters values (strings)
        const selectedOtherFiltersList = selectedOtherFilters?.map(item => item.value) || [];


        const filteredEssays = textsData
            .filter(({ grade, usersAssigned, normalizedByUser, sourceFileName }) => {
                const matchesGrade =
                    selectedGradesList.length === 0 || selectedGradesList.includes(Number(grade));
                const matchesTeacher =
                    selectedTeacherList.length === 0 || usersAssigned.some(teacher => selectedTeacherList.includes(teacher));
                const matchesCorrected =
                    selectedOtherFiltersList.length === 0 || selectedOtherFiltersList.includes(normalizedByUser);
                const matchesSearch = fuzzySearchLogic({ label: sourceFileName }, searchText);

                return matchesGrade && matchesTeacher && matchesCorrected && matchesSearch;
            })
            .map(({ id, sourceFileName }) => ({ value: id, label: sourceFileName }));

        localStorage.setItem('textIds', JSON.stringify(filteredEssays.map(essay => essay.value)));
        setFilteredEssays(filteredEssays);
    }

    // Handlers for dropdown changes
    const handleOtherFiltersChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedOtherFilters(selectedOptions);

        // Resets the filters
        changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOptions, essayInputValue);
    };

    const handleTeacherChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedTeacher(selectedOptions);

        // Resets the filters
        changeFilteredEssays(textsData, selectedGrades, selectedOptions, selectedOtherFilters, essayInputValue);
    };

    const handleGradeChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedGrades(selectedOptions);

        // Resets the filters
        changeFilteredEssays(textsData, selectedOptions, selectedTeacher, selectedOtherFilters, essayInputValue);
    };

    const handleEssayChange = (selectedOption) => {
        setSelectedEssay(selectedOption);
        if (selectedOption) {
            setEssayInputValue(selectedOption.label);
            changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOtherFilters, selectedOption.label);
        } else {
            setEssayInputValue('');
            changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOtherFilters, '');
        }
    };

    const handleEssayInputChange = (newValue, actionMeta) => {
        if (actionMeta.action === 'input-change') {
            setEssayInputValue(newValue);
            changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOtherFilters, newValue);
        }
    };

    return (
        <form className="essay-selector-container">
            {/* Essay Dropdown */}
            <div className="selector-main-search">
                <DropdownSelect
                    title="ID do Texto"
                    options={filteredEssays}
                    selectedValues={selectedEssay}
                    onChange={handleEssayChange}
                    isMulti={false}
                    filterOption={null}
                    inputValue={essayInputValue}
                    onInputChange={handleEssayInputChange}
                />
            </div>

            <div className="selector-filters-grid">
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
            </div>

            <div className="selector-footer">
                {/* Corrected texts count */}
                <div className="corrected-count">
                    Corrigidos: <strong>{
                        textsData.filter(({ id, normalizedByUser }) =>
                                normalizedByUser === true &&
                                filteredEssays.some((essay) => essay.value === id)
                            ).length
                    }</strong> de {filteredEssays.length}
                </div>
            </div>
        </form>
    )
}

EssaySelector.propTypes = {
    selectedEssay: PropTypes.object,
    setSelectedEssay: PropTypes.func,
};

export default EssaySelector;