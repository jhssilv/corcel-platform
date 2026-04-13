import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
	type ChangeEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../Components/Layout/TopBar";
import {
	Badge,
	Icon,
	Stack,
	Button,
	Checkbox,
	FormField,
	SectionHeader,
	FilterGrid,
	ListState,
	ListSurface,
	ListSurfaceItem,
	ModalScaffold,
	GenericTable,
	type GenericTableColumn,
} from "../Components/Generic";
import DropdownSelect, {
	type DropdownValue,
	type SelectOption,
} from "../Components/Common/DropdownSelect";
import {
	bulkAssignTexts,
	bulkUnassignTexts,
	getFilteredTextsData,
	getUsernames,
} from "../Api";
import { useSnackbar } from "../Context/Generic";
import type { FilterTextsRequest, TextMetadata } from "../types";
import styles from "./assignments_panel.module.css";
import layoutStyles from "./page_layout.module.css";

const gradeOptions: SelectOption<number>[] = [
	{ value: 0, label: "Nota 0" },
	{ value: 1, label: "Nota 1" },
	{ value: 2, label: "Nota 2" },
	{ value: 3, label: "Nota 3" },
	{ value: 4, label: "Nota 4" },
	{ value: 5, label: "Nota 5" },
];

const normalizedOptions: SelectOption<boolean>[] = [
	{ value: true, label: "Normalizado" },
	{ value: false, label: "Não Normalizado" },
];

type Mode = "assign" | "unassign";

interface PreviewItem {
	username: string;
	count: number;
}

interface AssignmentResult {
	totalTexts?: number;
	totalUsers?: number;
}

interface ErrorLike {
	message?: string;
}

const cx = (...classNames: Array<string | false | undefined>) =>
	classNames
		.filter(Boolean)
		.map((name) => styles[name as keyof typeof styles])
		.join(" ");

function AssignmentsPanel() {
	const navigate = useNavigate();

	const [mode, setMode] = useState<Mode>("assign");
	const [textsData, setTextsData] = useState<TextMetadata[]>([]);
	const [users, setUsers] = useState<SelectOption<string>[]>([]);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const { addSnackbar } = useSnackbar();

	const [selectedGrades, setSelectedGrades] = useState<SelectOption<number>[]>(
		[],
	);
	const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<
		SelectOption<string>[]
	>([]);
	const [selectedNormalized, setSelectedNormalized] = useState<
		SelectOption<boolean>[]
	>([]);
	const [searchText, setSearchText] = useState("");
	const deferredSearchText = useDeferredValue(searchText);

	const [selectedTextIds, setSelectedTextIds] = useState<Set<number>>(
		new Set(),
	);
	const [selectedTargetUsers, setSelectedTargetUsers] = useState<
		SelectOption<string>[]
	>([]);

	const [selectNValue, setSelectNValue] = useState("");
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [, startSelectionTransition] = useTransition();

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const usernamesResponse = await getUsernames();
				const userOptions = (usernamesResponse.usernames || []).map(
					(username: string) => ({ value: username, label: username }),
				);
				setUsers(userOptions);
			} catch (fetchError) {
				console.error(fetchError);
				addSnackbar({
					text: "Erro ao carregar usuários.",
					type: "error",
				});
			}
		};

		void fetchUsers();
	}, [addSnackbar]);

	const fetchFilteredTexts = useCallback(async () => {
		try {
			setLoading(true);

			const filters: FilterTextsRequest = {};

			if (selectedGrades.length > 0) {
				filters.grades = selectedGrades.map((grade) => grade.value);
			}

			if (selectedAssignedUsers.length > 0) {
				filters.assignedUsers = selectedAssignedUsers.map((user) => user.value);
			}

			if (selectedNormalized.length === 1) {
				filters.normalized = selectedNormalized[0].value;
			}

			if (deferredSearchText.trim()) {
				filters.fileName = deferredSearchText.trim();
			}

			const data = await getFilteredTextsData(filters);
			setTextsData(data || []);
			setSelectedTextIds(new Set());
		} catch (fetchError) {
			console.error(fetchError);
			addSnackbar({
				text: "Erro ao carregar textos.",
				type: "error",
			});
		} finally {
			setLoading(false);
		}
	}, [
		selectedGrades,
		selectedAssignedUsers,
		selectedNormalized,
		deferredSearchText,
		addSnackbar,
	]);

	useEffect(() => {
		const timeoutId = setTimeout(
			() => {
				void fetchFilteredTexts();
			},
			deferredSearchText ? 300 : 0,
		);

		return () => clearTimeout(timeoutId);
	}, [fetchFilteredTexts, deferredSearchText]);

	const selectedTargetUsernames = useMemo(() => {
		return selectedTargetUsers.map((user) => user.value);
	}, [selectedTargetUsers]);

	const assignmentTargetsByTextId = useMemo(() => {
		const map = new Map<number, string[]>();

		if (selectedTextIds.size === 0 || selectedTargetUsernames.length === 0) {
			return map;
		}

		if (mode === "assign") {
			let userIndex = 0;
			for (const text of textsData) {
				if (!selectedTextIds.has(text.id)) {
					continue;
				}

				const targetUser =
					selectedTargetUsernames[userIndex % selectedTargetUsernames.length];
				const currentAssignees = text.usersAssigned || [];
				map.set(
					text.id,
					currentAssignees.includes(targetUser) ? [] : [targetUser],
				);
				userIndex += 1;
			}

			return map;
		}

		const targetSet = new Set(selectedTargetUsernames);
		for (const text of textsData) {
			if (!selectedTextIds.has(text.id)) {
				continue;
			}

			const currentAssignees = text.usersAssigned || [];
			const targets = currentAssignees.filter((username) =>
				targetSet.has(username),
			);
			map.set(text.id, targets);
		}

		return map;
	}, [mode, textsData, selectedTextIds, selectedTargetUsernames]);

	const activePreview = useMemo<PreviewItem[]>(() => {
		if (selectedTextIds.size === 0 || selectedTargetUsernames.length === 0) {
			return [];
		}

		const userCounts: Record<string, number> = {};
		selectedTargetUsernames.forEach((username) => {
			userCounts[username] = 0;
		});

		for (const targets of assignmentTargetsByTextId.values()) {
			for (const username of targets) {
				userCounts[username] = (userCounts[username] || 0) + 1;
			}
		}

		return Object.entries(userCounts)
			.filter(([, count]) => count > 0)
			.map(([username, count]) => ({ username, count }));
	}, [
		selectedTextIds.size,
		selectedTargetUsernames,
		assignmentTargetsByTextId,
	]);

	const totalAffected = activePreview.reduce(
		(sum, item) => sum + item.count,
		0,
	);

	const assignmentTargetsByTextIdRef = useRef(assignmentTargetsByTextId);
	assignmentTargetsByTextIdRef.current = assignmentTargetsByTextId;

	const handleToggleText = useCallback((textId: number) => {
		startSelectionTransition(() => {
			setSelectedTextIds((previous) => {
				const nextSet = new Set(previous);
				if (nextSet.has(textId)) {
					nextSet.delete(textId);
				} else {
					nextSet.add(textId);
				}

				return nextSet;
			});
		});
	}, []);

	const handleTextRowClick = useCallback(
		(text: TextMetadata) => {
			handleToggleText(text.id);
		},
		[handleToggleText],
	);

	const textColumns: GenericTableColumn<TextMetadata>[] = useMemo(
		() => [
			{
				key: "selected",
				header: "",
				width: "40px",
				align: "center",
				render: (text, _rowIndex, context) => (
					<Checkbox
						checked={context.isSelected}
						onChange={() => handleToggleText(text.id)}
						onClick={(event) => event.stopPropagation()}
						aria-label={`Selecionar ${text.sourceFileName || `Texto ${text.id}`}`}
						size="sm"
					/>
				),
			},
			{
				key: "sourceFileName",
				header: "Arquivo",
				render: (text) => text.sourceFileName || `Texto ${text.id}`,
				truncate: true,
			},
			{
				key: "grade",
				header: "Nota",
				width: "90px",
				render: (text) => text.grade ?? "N/A",
				align: "center",
			},
			{
				key: "normalized",
				header: "Status",
				width: "150px",
				render: (text) =>
					text.normalizedByUser ? "Normalizado" : "Não normalizado",
				truncate: true,
			},
			{
				key: "usersAssigned",
				header: "Atribuído",
				render: (text) =>
					text.usersAssigned?.length
						? text.usersAssigned.join(", ")
						: "Sem atribuição",
				truncate: true,
			},
			{
				key: "targets",
				header: mode === "assign" ? "Destino" : "Remover de",
				render: (text, _rowIndex, context) => {
					if (!context.isSelected || selectedTargetUsernames.length === 0) {
						return "-";
					}

					const targets =
						assignmentTargetsByTextIdRef.current.get(text.id) || [];
					if (targets.length === 0) {
						return mode === "assign" ? "Sem nova atribuição" : "Nada a remover";
					}

					return targets.join(", ");
				},
				truncate: true,
			},
		],
		[mode, selectedTargetUsernames.length, handleToggleText],
	);

	const handleSelectAll = () => {
		startSelectionTransition(() => {
			setSelectedTextIds(new Set(textsData.map((text) => text.id)));
		});
	};

	const handleDeselectAll = () => {
		startSelectionTransition(() => {
			setSelectedTextIds(new Set());
		});
	};

	const handleSelectN = () => {
		const n = Number.parseInt(selectNValue, 10);
		if (Number.isNaN(n) || n <= 0) {
			return;
		}

		const toSelect = Math.min(n, textsData.length);
		const newSet = new Set<number>();

		for (let i = 0; i < toSelect; i += 1) {
			newSet.add(textsData[i].id);
		}

		startSelectionTransition(() => {
			setSelectedTextIds(newSet);
		});
		setSelectNValue("");
	};

	const handleOpenConfirmModal = () => {
		if (selectedTextIds.size === 0 || selectedTargetUsers.length === 0) {
			return;
		}

		if (activePreview.length === 0) {
			addSnackbar({
				text:
					mode === "assign"
						? "Nenhum texto será atribuído (todos já estão atribuídos aos usuários selecionados)."
						: "Nenhuma atribuição será removida (nenhum texto está atribuído aos usuários selecionados).",
				type: "warning",
			});
			return;
		}

		setShowConfirmModal(true);
	};

	const handleConfirmAction = async () => {
		setShowConfirmModal(false);

		try {
			setProcessing(true);

			const textIds = Array.from(selectedTextIds);
			const usernames = selectedTargetUsers.map((user) => user.value);

			if (mode === "assign") {
				const result = (await bulkAssignTexts(
					textIds,
					usernames,
				)) as AssignmentResult;
				addSnackbar({
					text: `Textos atribuídos com sucesso! Total: ${result.totalTexts} textos para ${result.totalUsers} usuários.`,
					type: "success",
				});
			} else {
				const result = (await bulkUnassignTexts(
					textIds,
					usernames,
				)) as AssignmentResult;
				addSnackbar({
					text: `Atribuições removidas com sucesso! Total: ${result.totalTexts} textos de ${result.totalUsers} usuários.`,
					type: "success",
				});
			}

			setSelectedTextIds(new Set());
			setSelectedTargetUsers([]);
			await fetchFilteredTexts();
		} catch (actionError) {
			console.error(actionError);
			addSnackbar({
				text: "Erro desconhecido ao processar atribuições.",
				type: "error",
			});
		} finally {
			setProcessing(false);
		}
	};

	const handleGradeFilterChange = (selected: DropdownValue<number>) => {
		setSelectedGrades(Array.isArray(selected) ? selected : []);
	};

	const handleAssignedUsersFilterChange = (selected: DropdownValue<string>) => {
		setSelectedAssignedUsers(Array.isArray(selected) ? selected : []);
	};

	const handleNormalizedFilterChange = (selected: DropdownValue<boolean>) => {
		setSelectedNormalized(Array.isArray(selected) ? selected : []);
	};

	const handleTargetUsersChange = (selected: DropdownValue<string>) => {
		setSelectedTargetUsers(Array.isArray(selected) ? selected : []);
	};

	return (
		<div className={layoutStyles.mainPageContainer}>
			<TopBar />

			<div
				className={`${styles["assignments-panel-container"]} ${layoutStyles.mainPageSection}`}
			>
				<SectionHeader
					preserveCase
					heading="Gerenciamento de Atribuições"
					actions={
						<Button
							tier="secondary"
							variant="neutral"
							leftIcon="ArrowLeft"
							onClick={() => navigate("/main")}
						>
							Voltar para Busca
						</Button>
					}
				/>

				<div className={styles["mode-toggle-container"]}>
					<button
						className={cx("mode-toggle-btn", mode === "assign" && "active")}
						onClick={() => setMode("assign")}
					>
						<Stack alignX="center" alignY="center" gap={8}>
							<Icon name="Plus" color="current" size={18} />
							Atribuir Textos
						</Stack>
					</button>
					<button
						className={cx(
							"mode-toggle-btn",
							"unassign",
							mode === "unassign" && "active",
						)}
						onClick={() => setMode("unassign")}
					>
						<Stack alignX="center" alignY="center" gap={8}>
							<Icon name="Minus" color="current" size={18} />
							Remover Atribuições
						</Stack>
					</button>
				</div>

				<div className={styles["assignments-filters"]}>
					<div className={styles["assignments-search-row"]}>
						<div>
							<FormField
								label="Buscar por nome do arquivo"
								htmlFor="assignments-search-input"
							>
								<input
									id="assignments-search-input"
									type="text"
									placeholder="Digite para buscar..."
									value={searchText}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										setSearchText(event.target.value)
									}
									className={styles["assignments-search-input"]}
								/>
							</FormField>
						</div>
					</div>

					<FilterGrid
						className={styles["assignments-filters-grid-spaced"]}
						minColumnWidth={200}
						gap={15}
					>
						<DropdownSelect
							title="Notas"
							options={gradeOptions}
							selectedValues={selectedGrades}
							onChange={handleGradeFilterChange}
							isMulti={true}
						/>
						<DropdownSelect
							title="Responsável Atual"
							options={users}
							selectedValues={selectedAssignedUsers}
							onChange={handleAssignedUsersFilterChange}
							isMulti={true}
						/>
						<DropdownSelect
							title="Status"
							options={normalizedOptions}
							selectedValues={selectedNormalized}
							onChange={handleNormalizedFilterChange}
							isMulti={true}
						/>
					</FilterGrid>
				</div>

				<div className={styles["assignments-texts-section"]}>
					<SectionHeader
						className={styles["assignments-texts-header"]}
						preserveCase
						heading={
							<Stack as="span" alignY="center" gap={12}>
								<span>Textos Disponíveis</span>
								<Badge
									text={`${selectedTextIds.size} de ${textsData.length} selecionados`}
									variant="secondary"
									size="md"
									iconPosition="none"
								/>
							</Stack>
						}
						actions={
							<div className={styles["assignments-selection-controls"]}>
								<div className={styles["select-n-control"]}>
									<input
										type="number"
										min="1"
										max={textsData.length}
										placeholder="N"
										value={selectNValue}
										onChange={(event: ChangeEvent<HTMLInputElement>) =>
											setSelectNValue(event.target.value)
										}
										className={styles["select-n-input"]}
									/>
									<Button
										tier="secondary"
										variant="neutral"
										size="sm"
										onClick={handleSelectN}
										disabled={
											!selectNValue ||
											Number.parseInt(selectNValue, 10) <= 0 ||
											Number.parseInt(selectNValue, 10) > textsData.length
										}
									>
										Selecionar N
									</Button>
								</div>
								<Button
									tier="secondary"
									variant="neutral"
									size="sm"
									onClick={handleSelectAll}
								>
									Selecionar Todos
								</Button>
								<Button
									tier="secondary"
									variant="neutral"
									size="sm"
									onClick={handleDeselectAll}
								>
									Desmarcar Todos
								</Button>
							</div>
						}
					/>

					<div className={styles["assignments-texts-list"]}>
						<ListState
							items={textsData}
							isLoading={loading}
							loadingContent={
								<p className={styles["no-selection-message"]}>Carregando...</p>
							}
							emptyContent={
								<p className={styles["no-selection-message"]}>
									Nenhum texto encontrado com os filtros atuais.
								</p>
							}
						>
							{(items) => (
								<GenericTable
									mode="grid"
									mobileMode="stack"
									columns={textColumns}
									data={items}
									getRowId={(text) => text.id}
									onRowClick={handleTextRowClick}
									isRowSelected={(text) => selectedTextIds.has(text.id)}
								/>
							)}
						</ListState>
					</div>
				</div>

				<div className={styles["assignments-users-section"]}>
					<SectionHeader
						preserveCase
						heading={mode === "assign" ? "Atribuir Para" : "Remover De"}
					/>
					<DropdownSelect
						title="Selecione os usuários"
						options={users}
						selectedValues={selectedTargetUsers}
						onChange={handleTargetUsersChange}
						isMulti={true}
					/>
				</div>

				<div
					className={cx(
						"assignments-preview",
						mode === "unassign" && "unassign-mode",
					)}
				>
					<SectionHeader
						preserveCase
						heading={
							mode === "assign"
								? "Prévia da Distribuição"
								: "Atribuições a Remover"
						}
					/>
					{activePreview.length === 0 ? (
						<p className={styles["no-selection-message"]}>
							{selectedTextIds.size === 0 || selectedTargetUsers.length === 0
								? "Selecione textos e usuários para ver a prévia."
								: mode === "assign"
									? "Nenhuma nova atribuição será feita (textos já atribuídos aos usuários)."
									: "Nenhuma atribuição será removida (textos não estão atribuídos aos usuários)."}
						</p>
					) : (
						<Stack wrap gap={15}>
							{activePreview.map((item) => (
								<Stack
									key={item.username}
									direction="vertical"
									gap={4}
									className={cx(
										"distribution-item",
										mode === "unassign" && "unassign",
									)}
								>
									<span
										className={cx(
											"distribution-username",
											mode === "unassign" && "unassign",
										)}
									>
										{item.username}
									</span>
									<span className={styles["distribution-count"]}>
										{item.count} textos
									</span>
								</Stack>
							))}
						</Stack>
					)}
				</div>

				<Stack alignX="space-between" gap={15}>
					<Button
						tier="secondary"
						variant="neutral"
						onClick={() => navigate("/main")}
					>
						← Voltar para Busca
					</Button>
					<Button
						tier="primary"
						variant={mode === "assign" ? "action" : "danger"}
						onClick={handleOpenConfirmModal}
						disabled={
							selectedTextIds.size === 0 ||
							selectedTargetUsers.length === 0 ||
							processing ||
							activePreview.length === 0
						}
						isLoading={processing}
					>
						{processing
							? mode === "assign"
								? "Atribuindo..."
								: "Removendo..."
							: mode === "assign"
								? `Atribuir ${totalAffected} Textos`
								: `Remover ${totalAffected} Atribuições`}
					</Button>
				</Stack>
			</div>

			{showConfirmModal && (
				<ModalScaffold
					isOpen={showConfirmModal}
					onClose={() => setShowConfirmModal(false)}
					title={mode === "assign" ? "Confirmar Atribuição" : "Confirmar Remoção"}
					size="sm"
					footer={
						<>
							<Button
								tier="secondary"
								variant="neutral"
								onClick={() => setShowConfirmModal(false)}
							>
								Cancelar
							</Button>
							<Button
								tier="primary"
								variant="action"
								onClick={() => {
									void handleConfirmAction();
								}}
							>
								Confirmar
							</Button>
						</>
					}
				>
					<Stack direction="vertical" gap={12}>
						<p>
							{mode === "assign" ? (
								<>
									Você está prestes a atribuir{" "}
									<strong>{totalAffected} textos</strong> para os seguintes
									usuários:
								</>
							) : (
								<>
									Você está prestes a remover{" "}
									<strong>{totalAffected} atribuições</strong> dos seguintes
									usuários:
								</>
							)}
						</p>
						<ListSurface>
							<Stack direction="vertical" gap={8}>
								{activePreview.map((item) => (
									<ListSurfaceItem key={item.username}>
										<Stack alignY="center" gap={8}>
											<Badge
												text={item.username}
												variant={mode === "assign" ? "secondary" : "danger"}
												size="sm"
												iconPosition="none"
											/>
											<span>{item.count} textos</span>
										</Stack>
									</ListSurfaceItem>
								))}
							</Stack>
						</ListSurface>
						<p>Deseja continuar?</p>
					</Stack>
				</ModalScaffold>
			)}
		</div>
	);
}

export default AssignmentsPanel;
