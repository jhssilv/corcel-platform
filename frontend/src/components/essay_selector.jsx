import { useState, useEffect } from 'react';
import DropdownSelect from './dropdown_select.jsx';
import PropTypes from 'prop-types';

import { getTextsData, getUsernames, toggleNormalizedStatus } from './api/api_functions.jsx';

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

        // Carrega textsData do localStorage
        const data = localStorage.getItem('textsData');
        if (data) {
            const parsedData = JSON.parse(data);
            setTextsData(parsedData);
            changeFilteredEssays(parsedData, null, null, null);
        }
    }, []);

    if (!textsData) {
        return <p>Carregando dados...</p>;
    }

    function changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOtherFilters) {

        // Extract selected grade values (numbers)
        const selectedGradesList = selectedGrades?.map(item => item.value) || [];

        // Extract selected teacher values (strings) - now expecting an array since isMulti=true
        const selectedTeacherList = selectedTeacher?.map(item => item.value) || [];

        // Extract other filters values (strings)
        const selectedOtherFiltersList = selectedOtherFilters?.map(item => item.value) || [];


        const filteredEssays = textsData
            .filter(({ grade, usersAssigned, normalizedByUser }) => {
                const matchesGrade =
                    selectedGradesList.length === 0 || selectedGradesList.includes(Number(grade));
                const matchesTeacher =
                    selectedTeacherList.length === 0 || usersAssigned.some(teacher => selectedTeacherList.includes(teacher));
                const matchesCorrected =
                    selectedOtherFiltersList.length === 0 || selectedOtherFiltersList.includes(normalizedByUser);

                return matchesGrade && matchesTeacher && matchesCorrected;
            })
            .map(({ id, sourceFileName }) => ({ value: id, label: sourceFileName }));


        setFilteredEssays(filteredEssays);
    }

    const handleFinishedToggled = async () => {

        const userId = localStorage.getItem('userId');
        await toggleNormalizedStatus(selectedEssay.value, userId);
        const updatedTexts = await getTextsData(userId);

        setTextsData(updatedTexts);
        changeFilteredEssays(updatedTexts, selectedGrades, selectedTeacher, selectedOtherFilters);
    };

    // Handlers for dropdown changes
    const handleOtherFiltersChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedOtherFilters(selectedOptions);

        // Resets the filters
        changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOptions);
    };

    const handleTeacherChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedTeacher(selectedOptions);

        // Resets the filters
        changeFilteredEssays(textsData, selectedGrades, selectedOptions, selectedOtherFilters);
    };

    const handleGradeChange = (selectedOptions) => {
        // Goes to the dropdown
        setSelectedGrades(selectedOptions);

        // Resets the filters
        changeFilteredEssays(textsData, selectedOptions, selectedTeacher, selectedOtherFilters);
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
                            checked={textsData.find((e) => e.id === selectedEssay.value).normalizedByUser}
                            onChange={() => handleFinishedToggled()}
                        />
                        <label htmlFor="cb-47">Finalizado?</label>
                    </div>
                </div>
            )}
            {/* Corrected texts count */}
            <div id="correctedCount">
                Corrigidos: {
                    textsData.filter(({ id, normalizedByUser }) =>
                            normalizedByUser === true &&
                            filteredEssays.some((essay) => essay.value === id)
                        ).length
                } de {filteredEssays.length}.
            </div>
        </form>
    )
}

EssaySelector.propTypes = {
    selectedEssay: PropTypes.object,
    setSelectedEssay: PropTypes.func,
};

export default EssaySelector;