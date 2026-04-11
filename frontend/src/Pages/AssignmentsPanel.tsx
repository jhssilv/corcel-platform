import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../Components/Layout/TopBar';
import { Badge, Icon } from '../Components/Generic';
import DropdownSelect, { type DropdownValue, type SelectOption } from '../Components/Common/DropdownSelect';
import { bulkAssignTexts, bulkUnassignTexts, getFilteredTextsData, getUsernames } from '../Api';
import { useSnackbar } from '../Context/Generic';
import type { FilterTextsRequest, TextMetadata } from '../types';
import '../styles/assignments_panel.css';
import '../styles/main_page.css';

const gradeOptions: SelectOption<number>[] = [
    { value: 0, label: 'Nota 0' },
    { value: 1, label: 'Nota 1' },
    { value: 2, label: 'Nota 2' },
    { value: 3, label: 'Nota 3' },
    { value: 4, label: 'Nota 4' },
    { value: 5, label: 'Nota 5' },
];

const normalizedOptions: SelectOption<boolean>[] = [
    { value: true, label: 'Normalizado' },
    { value: false, label: 'Não Normalizado' },
];

type Mode = 'assign' | 'unassign';

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

function AssignmentsPanel() {
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>('assign');
    const [textsData, setTextsData] = useState<TextMetadata[]>([]);
    const [users, setUsers] = useState<SelectOption<string>[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { addSnackbar } = useSnackbar();

    const [selectedGrades, setSelectedGrades] = useState<SelectOption<number>[]>([]);
    const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<SelectOption<string>[]>([]);
    const [selectedNormalized, setSelectedNormalized] = useState<SelectOption<boolean>[]>([]);
    const [searchText, setSearchText] = useState('');

    const [selectedTextIds, setSelectedTextIds] = useState<Set<number>>(new Set());
    const [selectedTargetUsers, setSelectedTargetUsers] = useState<SelectOption<string>[]>([]);

    const [selectNValue, setSelectNValue] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usernamesResponse = await getUsernames();
                const userOptions = (usernamesResponse.usernames || []).map((username: string) => ({ value: username, label: username }));
                setUsers(userOptions);
            } catch (fetchError) {
                console.error(fetchError);
                addSnackbar({
                    text: 'Erro ao carregar usuários.',
                    type: 'error',
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

            if (searchText.trim()) {
                filters.fileName = searchText.trim();
            }

            const data = await getFilteredTextsData(filters);
            setTextsData(data || []);
            setSelectedTextIds(new Set());
        } catch (fetchError) {
            console.error(fetchError);
            addSnackbar({
                text: 'Erro ao carregar textos.',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    }, [selectedGrades, selectedAssignedUsers, selectedNormalized, searchText, addSnackbar]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void fetchFilteredTexts();
        }, searchText ? 300 : 0);

        return () => clearTimeout(timeoutId);
    }, [fetchFilteredTexts, searchText]);

    const selectedTexts = useMemo(() => {
        return textsData.filter((text) => selectedTextIds.has(text.id));
    }, [textsData, selectedTextIds]);

    const assignPreview = useMemo<PreviewItem[]>(() => {
        if (selectedTextIds.size === 0 || selectedTargetUsers.length === 0) {
            return [];
        }

        const targetUsernames = selectedTargetUsers.map((user) => user.value);
        const userCounts: Record<string, number> = {};
        targetUsernames.forEach((username) => {
            userCounts[username] = 0;
        });

        let userIndex = 0;
        for (const text of selectedTexts) {
            const targetUser = targetUsernames[userIndex % targetUsernames.length];
            const currentAssignees = text.usersAssigned || [];

            if (!currentAssignees.includes(targetUser)) {
                userCounts[targetUser] += 1;
            }

            userIndex += 1;
        }

        return Object.entries(userCounts)
            .filter(([, count]) => count > 0)
            .map(([username, count]) => ({ username, count }));
    }, [selectedTextIds.size, selectedTargetUsers, selectedTexts]);

    const unassignPreview = useMemo<PreviewItem[]>(() => {
        if (selectedTextIds.size === 0 || selectedTargetUsers.length === 0) {
            return [];
        }

        const targetUsernames = selectedTargetUsers.map((user) => user.value);
        const userCounts: Record<string, number> = {};
        targetUsernames.forEach((username) => {
            userCounts[username] = 0;
        });

        for (const text of selectedTexts) {
            const currentAssignees = text.usersAssigned || [];
            for (const targetUser of targetUsernames) {
                if (currentAssignees.includes(targetUser)) {
                    userCounts[targetUser] += 1;
                }
            }
        }

        return Object.entries(userCounts)
            .filter(([, count]) => count > 0)
            .map(([username, count]) => ({ username, count }));
    }, [selectedTextIds.size, selectedTargetUsers, selectedTexts]);

    const activePreview = mode === 'assign' ? assignPreview : unassignPreview;
    const totalAffected = activePreview.reduce((sum, item) => sum + item.count, 0);

    const handleSelectAll = () => {
        setSelectedTextIds(new Set(textsData.map((text) => text.id)));
    };

    const handleDeselectAll = () => {
        setSelectedTextIds(new Set());
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

        setSelectedTextIds(newSet);
        setSelectNValue('');
    };

    const handleToggleText = (textId: number) => {
        setSelectedTextIds((previous) => {
            const nextSet = new Set(previous);
            if (nextSet.has(textId)) {
                nextSet.delete(textId);
            } else {
                nextSet.add(textId);
            }

            return nextSet;
        });
    };

    const handleOpenConfirmModal = () => {
        if (selectedTextIds.size === 0 || selectedTargetUsers.length === 0) {
            return;
        }

        if (activePreview.length === 0) {
            addSnackbar({
                text: mode === 'assign'
                    ? 'Nenhum texto será atribuído (todos já estão atribuídos aos usuários selecionados).'
                    : 'Nenhuma atribuição será removida (nenhum texto está atribuído aos usuários selecionados).',
                type: 'warning',
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

            if (mode === 'assign') {
                const result = (await bulkAssignTexts(textIds, usernames)) as AssignmentResult;
                addSnackbar({
                    text: `Textos atribuídos com sucesso! Total: ${result.totalTexts} textos para ${result.totalUsers} usuários.`,
                    type: 'success',
                });
            } else {
                const result = (await bulkUnassignTexts(textIds, usernames)) as AssignmentResult;
                addSnackbar({
                    text: `Atribuições removidas com sucesso! Total: ${result.totalTexts} textos de ${result.totalUsers} usuários.`,
                    type: 'success',
                });
            }

            setSelectedTextIds(new Set());
            setSelectedTargetUsers([]);
            await fetchFilteredTexts();
        } catch (actionError) {
            console.error(actionError);
            addSnackbar({
                text: 'Erro desconhecido ao processar atribuições.',
                type: 'error',
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
        <div className="main-page-container">
            <TopBar />

            <div className="assignments-panel-container main-page-section">
                <div className="assignments-panel-header">
                    <h2 className="assignments-panel-title">Gerenciamento de Atribuições</h2>
                    <button className="back-btn" onClick={() => navigate('/main')}>
                        ← Voltar para Busca
                    </button>
                </div>

                <div className="mode-toggle-container">
                    <button
                        className={`mode-toggle-btn ${mode === 'assign' ? 'active' : ''}`}
                        onClick={() => setMode('assign')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Icon name="Plus" color="black" size={18} style={{ color: 'currentColor' }} />
                        Atribuir Textos
                    </button>
                    <button
                        className={`mode-toggle-btn unassign ${mode === 'unassign' ? 'active' : ''}`}
                        onClick={() => setMode('unassign')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Icon name="Minus" color="black" size={18} style={{ color: 'currentColor' }} />
                        Remover Atribuições
                    </button>
                </div>

                <div className="assignments-filters">
                    <div className="assignments-search-row">
                        <div>
                            <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                                Buscar por nome do arquivo
                            </label>
                            <input
                                type="text"
                                placeholder="Digite para buscar..."
                                value={searchText}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: '#252525',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    color: '#e4e4e7',
                                    fontSize: '0.95rem',
                                }}
                            />
                        </div>
                    </div>

                    <div className="assignments-filters-grid" style={{ marginTop: '15px' }}>
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
                    </div>
                </div>

                <div className="assignments-texts-section">
                    <div className="assignments-texts-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 className="assignments-texts-title">Textos Disponíveis</h3>
                            <Badge
                                text={`${selectedTextIds.size} de ${textsData.length} selecionados`}
                                variant="secondary"
                                size="md"
                                iconPosition="none"
                            />
                        </div>
                        <div className="assignments-selection-controls">
                            <div className="select-n-control">
                                <input
                                    type="number"
                                    min="1"
                                    max={textsData.length}
                                    placeholder="N"
                                    value={selectNValue}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setSelectNValue(event.target.value)}
                                    className="select-n-input"
                                />
                                <button
                                    className="selection-btn"
                                    onClick={handleSelectN}
                                    disabled={!selectNValue || Number.parseInt(selectNValue, 10) <= 0 || Number.parseInt(selectNValue, 10) > textsData.length}
                                >
                                    Selecionar N
                                </button>
                            </div>
                            <button className="selection-btn" onClick={handleSelectAll}>Selecionar Todos</button>
                            <button className="selection-btn" onClick={handleDeselectAll}>Desmarcar Todos</button>
                        </div>
                    </div>

                    <div className="assignments-texts-list">
                        {loading ? (
                            <p className="no-selection-message">Carregando...</p>
                        ) : textsData.length === 0 ? (
                            <p className="no-selection-message">Nenhum texto encontrado com os filtros atuais.</p>
                        ) : (
                            textsData.map((text) => (
                                <div
                                    key={text.id}
                                    className={`assignments-text-item ${selectedTextIds.has(text.id) ? 'selected' : ''}`}
                                    onClick={() => handleToggleText(text.id)}
                                >
                                    <input
                                        type="checkbox"
                                        className="assignments-text-checkbox"
                                        checked={selectedTextIds.has(text.id)}
                                        onChange={() => undefined}
                                    />
                                    <div className="assignments-text-info">
                                        <span className="assignments-text-name">{text.sourceFileName || `Texto ${text.id}`}</span>
                                        <span className="assignments-text-meta">
                                            ID: {text.id} | Nota: {text.grade ?? 'N/A'} |
                                            {text.normalizedByUser ? ' Normalizado' : ' Não normalizado'}
                                            {text.usersAssigned?.length > 0 && ` | Atribuído: ${text.usersAssigned.join(', ')}`}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="assignments-users-section">
                    <h3 className="assignments-users-title">{mode === 'assign' ? 'Atribuir Para' : 'Remover De'}</h3>
                    <DropdownSelect
                        title="Selecione os usuários"
                        options={users}
                        selectedValues={selectedTargetUsers}
                        onChange={handleTargetUsersChange}
                        isMulti={true}
                    />
                </div>

                <div className={`assignments-preview ${mode === 'unassign' ? 'unassign-mode' : ''}`}>
                    <h3 className="assignments-preview-title">
                        {mode === 'assign' ? 'Prévia da Distribuição' : 'Atribuições a Remover'}
                    </h3>
                    {activePreview.length === 0 ? (
                        <p className="no-selection-message">
                            {selectedTextIds.size === 0 || selectedTargetUsers.length === 0
                                ? 'Selecione textos e usuários para ver a prévia.'
                                : mode === 'assign'
                                    ? 'Nenhuma nova atribuição será feita (textos já atribuídos aos usuários).'
                                    : 'Nenhuma atribuição será removida (textos não estão atribuídos aos usuários).'}
                        </p>
                    ) : (
                        <div className="assignments-distribution">
                            {activePreview.map((item) => (
                                <div key={item.username} className={`distribution-item ${mode === 'unassign' ? 'unassign' : ''}`}>
                                    <span className={`distribution-username ${mode === 'unassign' ? 'unassign' : ''}`}>
                                        {item.username}
                                    </span>
                                    <span className="distribution-count">{item.count} textos</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="assignments-actions">
                    <button className="back-btn" onClick={() => navigate('/main')}>← Voltar</button>
                    <button
                        className={mode === 'assign' ? 'assign-btn' : 'unassign-btn'}
                        onClick={handleOpenConfirmModal}
                        disabled={selectedTextIds.size === 0 || selectedTargetUsers.length === 0 || processing || activePreview.length === 0}
                    >
                        {processing
                            ? mode === 'assign'
                                ? 'Atribuindo...'
                                : 'Removendo...'
                            : mode === 'assign'
                                ? `Atribuir ${totalAffected} Textos`
                                : `Remover ${totalAffected} Atribuições`}
                    </button>
                </div>
            </div>

            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="upload-modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{mode === 'assign' ? 'Confirmar Atribuição' : 'Confirmar Remoção'}</h3>
                            <button className="modal-close-button" onClick={() => setShowConfirmModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>
                                {mode === 'assign'
                                    ? <>
                                        Você está prestes a atribuir <strong>{totalAffected} textos</strong> para os seguintes usuários:
                                    </>
                                    : <>
                                        Você está prestes a remover <strong>{totalAffected} atribuições</strong> dos seguintes usuários:
                                    </>}
                            </p>
                            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#252525', borderRadius: '8px' }}>
                                {activePreview.map((item) => (
                                    <p key={item.username} style={{ color: '#e4e4e7' }}>
                                        <span style={{ color: mode === 'assign' ? '#3b82f6' : '#ef4444' }}>{item.username}</span>: {item.count} textos
                                    </p>
                                ))}
                            </div>
                            <p style={{ marginTop: '15px', color: '#888' }}>Deseja continuar?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-button cancel-button" onClick={() => setShowConfirmModal(false)}>
                                Cancelar
                            </button>
                            <button
                                className="modal-button confirm-button valid"
                                onClick={() => {
                                    void handleConfirmAction();
                                }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AssignmentsPanel;