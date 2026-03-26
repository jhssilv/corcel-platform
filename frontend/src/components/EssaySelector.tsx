import { useCallback, useEffect, useState } from 'react';
import DropdownSelect, { type DropdownValue, type SelectOption } from './DropdownSelect';
import { getRawTextsData, getTextsData, getUsernames } from './api/APIFunctions';
import type { RawTextMetadata, TextMetadata } from '../types';
import '../styles/essay_selector.css';

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

  useEffect(() => {
    const fetchUsernames = async () => {
      const usernamesData = await getUsernames();
      const usernames = usernamesData.usernames || [];
      setTeachers(usernames.map((username) => ({ value: username, label: username })));
    };

    void fetchUsernames();
  }, []);

  useEffect(() => {
    const fetchTexts = async () => {
      try {
        const data = onlyRaw ? await getRawTextsData() : await getTextsData();
        setTextsData(data);
      } catch (error) {
        console.error('Failed to fetch texts data:', error);
      }
    };

    void fetchTexts();
  }, [refreshTrigger, onlyRaw]);

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
          || fullItem.usersAssigned.some((teacher) => selectedTeacherList.includes(teacher));

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
    <form className="essay-selector-container">
      <div className="selector-main-search">
        <div className="search-with-info">
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
          <div className="info-tooltip-container">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="info-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div className="tooltip-text">
              Digite o id do texto para buscar. Exemplo: &quot;2015 n4&quot; encontrará &quot;2015_n4_12345.txt&quot;.
            </div>
          </div>
        </div>
      </div>

      <div className="selector-filters-grid">
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

      <div className="selector-footer">
        <div className="corrected-count">
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
      </div>
    </form>
  );
};

export default EssaySelector;