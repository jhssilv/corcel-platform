import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type Ref,
} from "react";
import {
	Button,
	Checkbox,
	FloatingPanel,
	FormField,
	ModalScaffold,
	Stack,
} from "../Generic";
import { setTokenNormalizationFlag } from "../../Api";
import styles from "./candidate_inspector_panel.module.css";

interface CandidateInspectorPanelProps {
	selectedTokenText: string;
	singleWordSelected: boolean;
	toBeNormalized?: boolean;
	refreshEssay: () => Promise<void> | void;
	suggestForAll: boolean;
	setSuggestForAll: (value: boolean) => void;
	onClose: () => void;
	tokenId?: number;
	onSelectCandidate: (candidate: string) => void;
	forwardRef?: Ref<HTMLDivElement>;
	hasCandidates: boolean;
}

const CandidateInspectorPanel = ({
	selectedTokenText,
	singleWordSelected,
	toBeNormalized,
	refreshEssay,
	suggestForAll,
	setSuggestForAll,
	onClose,
	tokenId,
	onSelectCandidate,
	forwardRef,
	hasCandidates,
}: CandidateInspectorPanelProps) => {
	const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
	const [replacementValue, setReplacementValue] = useState("");
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const trimmedReplacement = useMemo(
		() => replacementValue.trim(),
		[replacementValue],
	);

	const replacementLabel = "Substituição";
	const selectionLabel = "seleção";
	const globalSuggestionLabel = "Usar como sugestão global";
	const globalSuggestionTitle = "Aplicação da sugestão";
	const globalSuggestionDescription =
		"Adiciona o que foi digitado como sugestão para todas as ocorrências deste token em outros textos.";
	const normalizationDescription =
		'Isso apenas remove ou adiciona a marcação de "Não Normalizado".';
	const headerTitle =
		hasCandidates && singleWordSelected ? "Editar token" : "Editar seleção";
	const selectionSummaryLabel = singleWordSelected
		? "Token selecionado"
		: "Seleção atual";
	const selectionSummaryValue = `"${selectedTokenText}"`;

	const applyReplacement = () => {
		if (!trimmedReplacement) {
			return;
		}

		onSelectCandidate(trimmedReplacement);
		setReplacementValue("");
	};

	const handleConfirmNormalizationToggle = async () => {
		if (typeof tokenId !== "number") {
			return;
		}

		await setTokenNormalizationFlag(tokenId, !(toBeNormalized ?? false));
		await refreshEssay();
		setShowRemoveConfirmation(false);
	};

	return (
		<>
			<FloatingPanel
				title={headerTitle}
				onClose={onClose}
				storageKey="candidatesPanelPosition"
				width={340}
				maxHeight="80vh"
				forwardRef={forwardRef}
			>
				<Stack direction="vertical" gap={16}>
					<Stack
						direction="vertical"
						gap={6}
						className={styles.selectionSummary}
					>
						<p className={styles.selectionSummaryLabel}>
							{selectionSummaryLabel}
						</p>
						<p className={styles.selectionSummaryValue}>
							{selectionSummaryValue}
						</p>
					</Stack>

					<FormField
						label={replacementLabel}
						htmlFor="candidate-replacement-input"
						helperText={
							singleWordSelected
								? `Digite um novo token para substituir a ${selectionLabel} atual.`
								: "Digite o texto que deve substituir a faixa selecionada."
						}
					>
						<input
							id="candidate-replacement-input"
							ref={inputRef}
							value={replacementValue}
							placeholder={replacementLabel}
							onChange={(event) => setReplacementValue(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									applyReplacement();
								}
							}}
						/>
					</FormField>

					<Stack direction="vertical" gap={8}>
						<Button
							tier="primary"
							variant="action"
							size="md"
							data-testid="edit-button"
							onClick={applyReplacement}
							disabled={!trimmedReplacement}
							fullWidth
							leftIcon="Pencil"
						>
							{`Aplicar ${replacementLabel.toLowerCase()}`}
						</Button>
						<Button
							tier="secondary"
							variant="danger"
							size="md"
							data-testid="delete-button"
							onClick={() => onSelectCandidate("")}
							fullWidth
							leftIcon="Trash2"
						>
							{`Remover ${replacementLabel.toLowerCase()}`}
						</Button>
						{typeof tokenId === "number" ? (
							<Button
								tier={toBeNormalized ? "secondary" : "primary"}
								variant={toBeNormalized ? "neutral" : "action"}
								size="md"
								data-testid="toggle-suggestion-button"
								onClick={() => setShowRemoveConfirmation(true)}
								fullWidth
								leftIcon="CheckCircle2"
							>
								{toBeNormalized
									? "Marcar como normalizado"
									: "Marcar como não normalizado"}
							</Button>
						) : null}
					</Stack>

					<Stack
						direction="vertical"
						gap={8}
						className={styles.suggestionSection}
					>
						<p className={styles.sectionTitle}>{globalSuggestionTitle}</p>
						<div data-testid="global-suggestion-label">
							<Checkbox
								checked={suggestForAll}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setSuggestForAll(event.target.checked)
								}
								label={globalSuggestionLabel}
								size="sm"
							/>
						</div>
						<p className={styles.helperText}>
							{globalSuggestionDescription}
						</p>
					</Stack>
				</Stack>
			</FloatingPanel>

			<ModalScaffold
				isOpen={showRemoveConfirmation}
				onClose={() => setShowRemoveConfirmation(false)}
				size="sm"
				title="Marcar token como (in)correto?"
				dialogTestId="confirmation-dialog"
				bodyClassName={styles.dialogBody}
				footer={
					<div className={styles.dialogFooterContent}>
						<Button
							tier="secondary"
							variant="neutral"
							onClick={() => setShowRemoveConfirmation(false)}
						>
							Cancelar
						</Button>
						<Button
							tier="primary"
							variant="action"
							onClick={() => {
								void handleConfirmNormalizationToggle();
							}}
						>
							Confirmar
						</Button>
					</div>
				}
			>
				<p className={styles.helperText}>{normalizationDescription}</p>
			</ModalScaffold>
		</>
	);
};

export default CandidateInspectorPanel;
