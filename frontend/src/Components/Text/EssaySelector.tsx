import { useCallback, useEffect, useState } from 'react';
import DropdownSelect, { type DropdownValue, type SelectOption } from '../Common/DropdownSelect';
import { Icon } from '../Generic';
import { Stack } from '../Generic';
import { getRawTextsData, getTextsData, getUsernames } from '../../Api';
import { useSnackbar } from '../../Context/Generic';
import type { RawTextMetadata, TextMetadata } from '../../types';
import styles from '../../styles/essay_selector.module.css';

const gradeOptions: SelectOption<number>[] = [
    { value: 0, label: 'Nota 0' },
    { value: 1, label: 'Nota 1' },
    { value: 2, label: 'Nota 2' },
    { value: 3, label: 'Nota 3' },
    { value: 4, label: 'Nota 4' },
    { value: 5, label: 'Nota 5' },
];

const otherFilters: SelectOption<boolean>[] = [
    { value: true, label: 'Normalizado' },
    { value: false, label: 'Não Normalizado' },
];

type EssayListItem = TextMetadata | RawTextMetadata;

interface EssaySelectorProps {
    selectedEssay: SelectOption<number> | null;
    setSelectedEssay: (value: SelectOption<number> | null) => void;
    refreshTrigger?: number;
    onlyRaw?: boolean;
}

const EssaySelector = ({
    selectedEssay,
    setSelectedEssay,
    refreshTrigger = 0,
    onlyRaw = false,
}: EssaySelectorProps) => {
    const [textsData, setTextsData] = useState<EssayListItem[] | null>(null);
    const [selectedGrades, setSelectedGrades] = useState<SelectOption<number>[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<SelectOption<string>[]>([]);
    const [selectedOtherFilters, setSelectedOtherFilters] = useState<SelectOption<boolean>[]>([]);
    const [filteredEssays, setFilteredEssays] = useState<SelectOption<number>[]>([]);
    const [teachers, setTeachers] = useState<SelectOption<string>[]>([]);
    const [essayInputValue, setEssayInputValue] = useState('');
    const { addSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchUsernames = async () => {
            try {
                const usernamesData = await getUsernames();
                const usernames = usernamesData.usernames || [];
                setTeachers(usernames.map((username: string) => ({ value: username, label: username })));
            } catch (err) {
                console.error('Failed to fetch usernames:', err);
                addSnackbar({
                    text: 'Erro ao carregar usuários.',
                    type: 'error',
                    duration: 4000
                });
            }
        };

        void fetchUsernames();
    }, [addSnackbar]);

    useEffect(() => {
        const fetchTexts = async () => {
            try {
                const data = onlyRaw ? await getRawTextsData() : await getTextsData();
                setTextsData(data);
            } catch (err) {
                console.error('Failed to fetch texts data:', err);
                addSnackbar({
                    text: 'Erro ao carregar lista de textos.',
                    type: 'error',
                    duration: 5000
                });
            }
        };

        void fetchTexts();
    }, [refreshTrigger, onlyRaw, addSnackbar]);

    const fuzzySearchLogic = (candidateLabel: string, input: string) => {
        if (!input) {
            return true;
        }

        const pattern = input
            .split(' ')
            .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*');

        const regex = new RegExp(pattern, 'i');
        return regex.test(candidateLabel);
    };

    const changeFilteredEssays = useCallback((
        allTexts: EssayListItem[],
        selectedGradesValues: SelectOption<number>[],
        selectedTeacherValues: SelectOption<string>[],
        selectedOtherFilterValues: SelectOption<boolean>[],
        searchText = '',
    ) => {
        const selectedGradesList = selectedGradesValues.map((item) => item.value);
        const selectedTeacherList = selectedTeacherValues.map((item) => item.value);
        const selectedOtherFiltersList = selectedOtherFilterValues.map((item) => item.value);

        const nextFilteredEssays = allTexts
            .filter((item) => {
                if (onlyRaw) {
                    const sourceFileName = item.sourceFileName ?? '';
                    return fuzzySearchLogic(sourceFileName, searchText);
                }

                const fullItem = item as TextMetadata;

                const matchesGrade =
                    selectedGradesList.length === 0 || selectedGradesList.includes(Number(fullItem.grade));

                const matchesTeacher =
                    selectedTeacherList.length === 0
                    || fullItem.usersAssigned.some((teacher: string) => selectedTeacherList.includes(teacher));

                const matchesCorrected =
                    selectedOtherFiltersList.length === 0
                    || selectedOtherFiltersList.includes(fullItem.normalizedByUser);

                const matchesSearch = fuzzySearchLogic(fullItem.sourceFileName ?? '', searchText);

                return matchesGrade && matchesTeacher && matchesCorrected && matchesSearch;
            })
            .map((item) => ({
                value: item.id,
                label: item.sourceFileName ?? '',
            }));

        localStorage.setItem('textIds', JSON.stringify(nextFilteredEssays.map((essay) => essay.value)));
        setFilteredEssays(nextFilteredEssays);
    }, [onlyRaw]);

    useEffect(() => {
        if (!textsData) {
            return;
        }

        changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOtherFilters, essayInputValue);
    }, [textsData, selectedGrades, selectedTeacher, selectedOtherFilters, essayInputValue, changeFilteredEssays]);

    const handleOtherFiltersChange = (selectedOptions: DropdownValue<boolean>) => {
        if (!textsData) {
            return;
        }

        const nextSelected = Array.isArray(selectedOptions) ? selectedOptions : [];
        setSelectedOtherFilters(nextSelected);
        changeFilteredEssays(textsData, selectedGrades, selectedTeacher, nextSelected, essayInputValue);
    };

    const handleTeacherChange = (selectedOptions: DropdownValue<string>) => {
        if (!textsData) {
            return;
        }

        const nextSelected = Array.isArray(selectedOptions) ? selectedOptions : [];
        setSelectedTeacher(nextSelected);
        changeFilteredEssays(textsData, selectedGrades, nextSelected, selectedOtherFilters, essayInputValue);
    };

    const handleGradeChange = (selectedOptions: DropdownValue<number>) => {
        if (!textsData) {
            return;
        }

        const nextSelected = Array.isArray(selectedOptions) ? selectedOptions : [];
        setSelectedGrades(nextSelected);
        changeFilteredEssays(textsData, nextSelected, selectedTeacher, selectedOtherFilters, essayInputValue);
    };

    const handleEssayChange = (selectedOption: DropdownValue<number>) => {
        setSelectedEssay(Array.isArray(selectedOption) ? null : selectedOption);
    };

    const handleEssayInputChange = (newValue: string, actionMeta: { action: string }) => {
        if (!textsData) {
            return;
        }

        if (actionMeta.action !== 'input-change') {
            return;
        }

        setEssayInputValue(newValue);
        changeFilteredEssays(textsData, selectedGrades, selectedTeacher, selectedOtherFilters, newValue);
    };

    if (!textsData) {
        return <p>Carregando dados...</p>;
    }

    return (
        <form className={styles['essay-selector-container']}>
            <div className={styles['selector-main-search']}>
                <Stack alignY="center" gap={10} className={styles['search-with-info']} style={{ width: '100%' }}>
                    <div style={{ flexGrow: 1 }}>
                        <DropdownSelect
                            title="ID do Texto"
                            options={filteredEssays}
                            selectedValues={selectedEssay}
                            onChange={handleEssayChange}
                            isMulti={false}
                            filterOption={null}
                            inputValue={essayInputValue}
                            onInputChange={handleEssayInputChange}
                            controlShouldRenderValue={false}
                            blurInputOnSelect={false}
                        />
                    </div>
                    <Stack alignX="center" alignY="center" className={styles['info-tooltip-container']} style={{ position: 'relative', cursor: 'help' }}>
                        <Icon name="CircleHelp" color="black" className={styles['info-icon']} style={{ color: 'currentColor' }} />
                        <div className={styles['tooltip-text']}>
                            Digite o id do texto para buscar. Exemplo: &quot;2015 n4&quot; encontrará &quot;2015_n4_12345.txt&quot;.
                        </div>
                    </Stack>
                </Stack>
            </div>

            <div className={styles['selector-filters-grid']}>
                <DropdownSelect
                    title="Notas"
                    options={gradeOptions}
                    selectedValues={selectedGrades}
                    onChange={handleGradeChange}
                    isMulti={true}
                />
                <DropdownSelect
                    title="Responsável"
                    options={teachers}
                    selectedValues={selectedTeacher}
                    onChange={handleTeacherChange}
                    isMulti={true}
                />
                <DropdownSelect
                    title="Outros filtros"
                    options={otherFilters}
                    selectedValues={selectedOtherFilters}
                    onChange={handleOtherFiltersChange}
                    isMulti={true}
                />
            </div>

            <Stack alignX="space-between" alignY="center" className={styles['selector-footer']}>
                <div className={styles['corrected-count']} data-testid="corrected-count">
                    Finalizados:{' '}
                    <strong>
                        {
                            textsData.filter((item) => {
                                if (!('normalizedByUser' in item)) {
                                    return false;
                                }

                                return item.normalizedByUser === true
                                    && filteredEssays.some((essay) => essay.value === item.id);
                            }).length
                        }
                    </strong>{' '}
                    de {filteredEssays.length}
                </div>
            </Stack>
        </form>
    );
};

export default EssaySelector;