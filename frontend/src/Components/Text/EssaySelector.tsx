import { useCallback, useEffect, useState } from "react";
import DropdownSelect, {
	type DropdownValue,
	type SelectOption,
} from "../Common/DropdownSelect";
import { Icon } from "../Generic";
import { Stack } from "../Generic";
import { FilterGrid } from "../Generic";
import {
	getFilteredTextsData,
	getRawTextsData,
	getTextsData,
	getUsernames,
} from "../../Api";
import { useSnackbar } from "../../Context/Generic";
import type { RawTextMetadata, TextMetadata } from "../../types";
import styles from "../../styles/essay_selector.module.css";

const gradeOptions: SelectOption<number>[] = [
	{ value: 0, label: "Nota 0" },
	{ value: 1, label: "Nota 1" },
	{ value: 2, label: "Nota 2" },
	{ value: 3, label: "Nota 3" },
	{ value: 4, label: "Nota 4" },
	{ value: 5, label: "Nota 5" },
];

const otherFilters: SelectOption<boolean>[] = [
	{ value: true, label: "Normalizado" },
	{ value: false, label: "Não Normalizado" },
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
	const [selectedGrades, setSelectedGrades] = useState<SelectOption<number>[]>(
		[],
	);
	const [selectedTeacher, setSelectedTeacher] = useState<
		SelectOption<string>[]
	>([]);
	const [selectedOtherFilters, setSelectedOtherFilters] = useState<
		SelectOption<boolean>[]
	>([]);
	const [filteredEssays, setFilteredEssays] = useState<SelectOption<number>[]>(
		[],
	);
	const [teachers, setTeachers] = useState<SelectOption<string>[]>([]);
	const [essayInputValue, setEssayInputValue] = useState("");
	const [contentSearch, setContentSearch] = useState("");
	const [debouncedContentSearch, setDebouncedContentSearch] = useState("");
	const [isSearchingContent, setIsSearchingContent] = useState(false);
	const { addSnackbar } = useSnackbar();

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedContentSearch(contentSearch.trim());
		}, 350);

		return () => {
			clearTimeout(timer);
		};
	}, [contentSearch]);

	useEffect(() => {
		const fetchUsernames = async () => {
			try {
				const usernamesData = await getUsernames();
				const usernames = usernamesData.usernames || [];
				setTeachers(
					usernames.map((username: string) => ({
						value: username,
						label: username,
					})),
				);
			} catch (err) {
				console.error("Failed to fetch usernames:", err);
				addSnackbar({
					text: "Erro ao carregar usuários.",
					type: "error",
					duration: 4000,
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
				console.error("Failed to fetch texts data:", err);
				addSnackbar({
					text: "Erro ao carregar lista de textos.",
					type: "error",
					duration: 5000,
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
			.split(" ")
			.map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join(".*");

		const regex = new RegExp(pattern, "i");
		return regex.test(candidateLabel);
	};

	const changeFilteredEssays = useCallback(
		(
			allTexts: EssayListItem[],
			selectedGradesValues: SelectOption<number>[],
			selectedTeacherValues: SelectOption<string>[],
			selectedOtherFilterValues: SelectOption<boolean>[],
			searchText = "",
		) => {
			const selectedGradesList = selectedGradesValues.map((item) => item.value);
			const selectedTeacherList = selectedTeacherValues.map(
				(item) => item.value,
			);
			const selectedOtherFiltersList = selectedOtherFilterValues.map(
				(item) => item.value,
			);

			const nextFilteredEssays = allTexts
				.filter((item) => {
					if (onlyRaw) {
						const sourceFileName = item.sourceFileName ?? "";
						return fuzzySearchLogic(sourceFileName, searchText);
					}

					const fullItem = item as TextMetadata;

					const matchesGrade =
						selectedGradesList.length === 0 ||
						selectedGradesList.includes(Number(fullItem.grade));

					const matchesTeacher =
						selectedTeacherList.length === 0 ||
						fullItem.usersAssigned.some((teacher: string) =>
							selectedTeacherList.includes(teacher),
						);

					const matchesCorrected =
						selectedOtherFiltersList.length === 0 ||
						selectedOtherFiltersList.includes(fullItem.normalizedByUser);

					const matchesSearch = fuzzySearchLogic(
						fullItem.sourceFileName ?? "",
						searchText,
					);

					return (
						matchesGrade && matchesTeacher && matchesCorrected && matchesSearch
					);
				})
				.map((item) => ({
					value: item.id,
					label: item.sourceFileName ?? "",
				}));

			localStorage.setItem(
				"textIds",
				JSON.stringify(nextFilteredEssays.map((essay) => essay.value)),
			);
			setFilteredEssays(nextFilteredEssays);
		},
		[onlyRaw],
	);

	useEffect(() => {
		if (onlyRaw || !debouncedContentSearch) {
			return;
		}

		let isMounted = true;
		const fetchFiltered = async () => {
			setIsSearchingContent(true);
			try {
				const selectedGradesList = selectedGrades.map((item) => item.value);
				const selectedTeacherList = selectedTeacher.map((item) => item.value);

				const filteredData = await getFilteredTextsData({
					grades: selectedGradesList.length > 0 ? selectedGradesList : undefined,
					assignedUsers:
						selectedTeacherList.length > 0 ? selectedTeacherList : undefined,
					normalized:
						selectedOtherFilters.length === 1
							? selectedOtherFilters[0].value
							: undefined,
					fileName: essayInputValue.trim() || undefined,
					content: debouncedContentSearch,
				});

				if (!isMounted) return;

				const nextFilteredEssays = filteredData.map((item) => ({
					value: item.id,
					label: item.sourceFileName ?? "",
					snippet: item.snippet,
				}));

				localStorage.setItem(
					"textIds",
					JSON.stringify(nextFilteredEssays.map((essay) => essay.value)),
				);
				setFilteredEssays(nextFilteredEssays);
			} catch (err) {
				console.error("Failed to fetch filtered texts by content:", err);
				addSnackbar({
					text: "Erro ao buscar textos por conteúdo.",
					type: "error",
					duration: 4000,
				});
			} finally {
				if (isMounted) {
					setIsSearchingContent(false);
				}
			}
		};

		void fetchFiltered();

		return () => {
			isMounted = false;
		};
	}, [
		debouncedContentSearch,
		selectedGrades,
		selectedTeacher,
		selectedOtherFilters,
		essayInputValue,
		onlyRaw,
		addSnackbar,
	]);

	// In-memory filter when content search is empty
	useEffect(() => {
		if (!textsData || (!onlyRaw && debouncedContentSearch)) {
			return;
		}

		changeFilteredEssays(
			textsData,
			selectedGrades,
			selectedTeacher,
			selectedOtherFilters,
			essayInputValue,
		);
	}, [
		textsData,
		selectedGrades,
		selectedTeacher,
		selectedOtherFilters,
		essayInputValue,
		debouncedContentSearch,
		onlyRaw,
		changeFilteredEssays,
	]);

	const handleOtherFiltersChange = (
		selectedOptions: DropdownValue<boolean>,
	) => {
		const nextSelected = Array.isArray(selectedOptions) ? selectedOptions : [];
		setSelectedOtherFilters(nextSelected);
	};

	const handleTeacherChange = (selectedOptions: DropdownValue<string>) => {
		const nextSelected = Array.isArray(selectedOptions) ? selectedOptions : [];
		setSelectedTeacher(nextSelected);
	};

	const handleGradeChange = (selectedOptions: DropdownValue<number>) => {
		const nextSelected = Array.isArray(selectedOptions) ? selectedOptions : [];
		setSelectedGrades(nextSelected);
	};

	const handleEssayChange = (selectedOption: DropdownValue<number>) => {
		setSelectedEssay(Array.isArray(selectedOption) ? null : selectedOption);
	};

	const handleEssayInputChange = (
		newValue: string,
		actionMeta: { action: string },
	) => {
		if (actionMeta.action !== "input-change") {
			return;
		}
		setEssayInputValue(newValue);
	};

	const formatEssayOption = useCallback(
		(
			option: SelectOption<number>,
			{ context }: { context: "menu" | "value" },
		) => {
			if (context === "menu" && option.snippet) {
				return (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "2px",
							textAlign: "left",
						}}
					>
						<span style={{ fontWeight: 500 }}>{option.label}</span>
						<span
							style={{
								fontSize: "0.78rem",
								color: "var(--color-text-muted)",
								fontStyle: "italic",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								maxWidth: "350px",
							}}
						>
							{option.snippet}
						</span>
					</div>
				);
			}
			return option.label;
		},
		[],
	);

	if (!textsData) {
		return <p>Carregando dados...</p>;
	}

	return (
		<form className={styles["essay-selector-container"]}>
			<div className={styles["selector-main-search"]}>
				<div className={styles["selector-search-grid"]}>
					<Stack
						alignY="center"
						gap={10}
						className={styles["search-with-info"]}
						style={{ width: "100%" }}
					>
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
								formatOptionLabel={formatEssayOption}
							/>
						</div>
						<Stack
							alignX="center"
							alignY="center"
							className={styles["info-tooltip-container"]}
							style={{ position: "relative", cursor: "help" }}
						>
							<Icon
								name="CircleHelp"
								color="black"
								className={styles["info-icon"]}
								style={{ color: "currentColor" }}
							/>
							<div className={styles["tooltip-text"]}>
								Digite o id do texto para buscar. Exemplo: &quot;2015 n4&quot;
								encontrará &quot;2015_n4_12345.txt&quot;.
							</div>
						</Stack>
					</Stack>

					{!onlyRaw && (
						<Stack
							alignY="center"
							gap={10}
							className={styles["search-with-info"]}
							style={{ width: "100%" }}
						>
							<div
								style={{ flexGrow: 1 }}
								className={styles["content-search-container"]}
							>
								<input
									type="text"
									className={styles["content-search-input"]}
									placeholder="Buscar no conteúdo do texto..."
									value={contentSearch}
									onChange={(e) => setContentSearch(e.target.value)}
								/>
								{contentSearch && (
									<button
										type="button"
										className={styles["content-search-clear-btn"]}
										onClick={() => setContentSearch("")}
										aria-label="Limpar busca de conteúdo"
									>
										<Icon name="X" color="current" size={16} />
									</button>
								)}
							</div>
							<Stack
								alignX="center"
								alignY="center"
								className={styles["info-tooltip-container"]}
								style={{ position: "relative", cursor: "help" }}
							>
								<Icon
									name="CircleHelp"
									color="black"
									className={styles["info-icon"]}
									style={{ color: "currentColor" }}
								/>
								<div className={styles["tooltip-text"]}>
									Busca palavras ou trechos dentro dos textos (sem distinção
									de acentos ou maiúsculas).
								</div>
							</Stack>
						</Stack>
					)}
				</div>
			</div>

			<FilterGrid
				className={styles["selector-filters-grid"]}
				minColumnWidth={250}
				gap={15}
				marginBottom={20}
			>
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
			</FilterGrid>

			<Stack
				alignX="space-between"
				alignY="center"
				className={styles["selector-footer"]}
			>
				<div
					className={styles["corrected-count"]}
					data-testid="corrected-count"
				>
					{isSearchingContent ? (
						<span>Buscando textos no corpus...</span>
					) : (
						<>
							Finalizados:{" "}
							<strong>
								{
									textsData.filter((item) => {
										if (!("normalizedByUser" in item)) {
											return false;
										}

										return (
											item.normalizedByUser === true &&
											filteredEssays.some((essay) => essay.value === item.id)
										);
									}).length
								}
							</strong>{" "}
							de {filteredEssays.length}
							{debouncedContentSearch && (
								<span style={{ marginLeft: "8px", fontStyle: "italic" }}>
									(filtrado por &quot;{debouncedContentSearch}&quot;)
								</span>
							)}
						</>
					)}
				</div>
			</Stack>
		</form>
	);
};

export default EssaySelector;
