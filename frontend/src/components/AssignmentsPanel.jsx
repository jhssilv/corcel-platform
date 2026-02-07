import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import DropdownSelect from './DropdownSelect';
import { getTextsData, getUsernames, bulkAssignTexts } from './api/APIFunctions';
import '../styles/assignments_panel.css';
import '../styles/main_page.css';

const gradeOptions = [
    { value: 0, label: 'Nota 0' },
    { value: 1, label: 'Nota 1' },
    { value: 2, label: 'Nota 2' },
    { value: 3, label: 'Nota 3' },
    { value: 4, label: 'Nota 4' },
    { value: 5, label: 'Nota 5' },
];

const normalizedOptions = [
    { value: true, label: 'Normalizado' },
    { value: false, label: 'Não Normalizado' }
];

function AssignmentsPanel() {
    const navigate = useNavigate();
    
    // Data states
    const [textsData, setTextsData] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [assigning, setAssigning] = useState(false);
    
    // Filter states
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [selectedAssignedUsers, setSelectedAssignedUsers] = useState([]);
    const [selectedNormalized, setSelectedNormalized] = useState([]);
    const [searchText, setSearchText] = useState('');
    
    // Selection states
    const [selectedTextIds, setSelectedTextIds] = useState(new Set());
    const [selectedTargetUsers, setSelectedTargetUsers] = useState([]);
    
    // Select N feature
    const [selectNValue, setSelectNValue] = useState('');
    
    // Confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [textsResponse, usernamesResponse] = await Promise.all([
                    getTextsData(),
                    getUsernames()
                ]);
                setTextsData(textsResponse);
                const userOptions = (usernamesResponse.usernames || []).map(u => ({ value: u, label: u }));
                setUsers(userOptions);
            } catch (err) {
                setError('Erro ao carregar dados.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    // Fuzzy search logic (same as EssaySelector)
    const fuzzySearchLogic = (sourceFileName, input) => {
        if (!input) return true;
        const pattern = input
            .split(' ')
            .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*');
        const regex = new RegExp(pattern, 'i');
        return regex.test(sourceFileName);
    };
    
    // Filter texts based on current filter selections
    const filteredTexts = useMemo(() => {
        const selectedGradesList = selectedGrades.map(item => item.value);
        const selectedAssignedUsersList = selectedAssignedUsers.map(item => item.value);
        const selectedNormalizedList = selectedNormalized.map(item => item.value);
        
        return textsData.filter((item) => {
            const { grade, usersAssigned, normalizedByUser, sourceFileName } = item;
            
            const matchesGrade = selectedGradesList.length === 0 || selectedGradesList.includes(Number(grade));
            const matchesAssignedUser = selectedAssignedUsersList.length === 0 || 
                (usersAssigned || []).some(user => selectedAssignedUsersList.includes(user));
            const matchesNormalized = selectedNormalizedList.length === 0 || selectedNormalizedList.includes(normalizedByUser);
            const matchesSearch = fuzzySearchLogic(sourceFileName || '', searchText);
            
            return matchesGrade && matchesAssignedUser && matchesNormalized && matchesSearch;
        });
    }, [textsData, selectedGrades, selectedAssignedUsers, selectedNormalized, searchText]);
    
    // Calculate assignment distribution
    const assignmentDistribution = useMemo(() => {
        if (selectedTextIds.size === 0 || selectedTargetUsers.length === 0) {
            return [];
        }
        
        const textsPerUser = Math.floor(selectedTextIds.size / selectedTargetUsers.length);
        const remainder = selectedTextIds.size % selectedTargetUsers.length;
        
        return selectedTargetUsers.map((user, index) => ({
            username: user.value,
            count: textsPerUser + (index < remainder ? 1 : 0)
        }));
    }, [selectedTextIds, selectedTargetUsers]);
    
    // Selection handlers
    const handleSelectAll = () => {
        const allIds = new Set(filteredTexts.map(t => t.id));
        setSelectedTextIds(allIds);
    };
    
    const handleDeselectAll = () => {
        setSelectedTextIds(new Set());
    };
    
    // Select N from filtered texts
    const handleSelectN = () => {
        const n = parseInt(selectNValue, 10);
        if (isNaN(n) || n <= 0) return;
        
        // Select first N from filtered texts (not already selected)
        const toSelect = Math.min(n, filteredTexts.length);
        const newSet = new Set();
        for (let i = 0; i < toSelect; i++) {
            newSet.add(filteredTexts[i].id);
        }
        setSelectedTextIds(newSet);
        setSelectNValue('');
    };
    
    const handleToggleText = (textId) => {
        setSelectedTextIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(textId)) {
                newSet.delete(textId);
            } else {
                newSet.add(textId);
            }
            return newSet;
        });
    };
    
    // Open confirmation modal
    const handleOpenConfirmModal = () => {
        if (selectedTextIds.size === 0 || selectedTargetUsers.length === 0) {
            return;
        }
        setShowConfirmModal(true);
    };
    
    // Assignment handler
    const handleConfirmAssign = async () => {
        setShowConfirmModal(false);
        
        try {
            setAssigning(true);
            setError('');
            setSuccess('');
            
            const textIds = Array.from(selectedTextIds);
            const usernames = selectedTargetUsers.map(u => u.value);
            
            const result = await bulkAssignTexts(textIds, usernames);
            
            setSuccess(`Textos atribuídos com sucesso! Total: ${result.totalTexts} textos para ${result.totalUsers} usuários.`);
            setSelectedTextIds(new Set());
            setSelectedTargetUsers([]);
            
            // Refresh texts data
            const textsResponse = await getTextsData();
            setTextsData(textsResponse);
            
        } catch (err) {
            setError('Erro ao atribuir textos: ' + (err.message || 'Erro desconhecido'));
            console.error(err);
        } finally {
            setAssigning(false);
        }
    };
    
    if (loading) {
        return (
            <div className="main-page-container">
                <TopBar />
                <div className="assignments-loading">Carregando...</div>
            </div>
        );
    }
    
    return (
        <div className="main-page-container">
            <TopBar />
            
            <div className="assignments-panel-container main-page-section">
                <div className="assignments-panel-header">
                    <h2 className="assignments-panel-title">Atribuição de Textos</h2>
                    <button className="back-btn" onClick={() => navigate('/main')}>
                        ← Voltar para Busca
                    </button>
                </div>
                
                {success && <div className="assignments-success">{success}</div>}
                {error && <div className="assignments-error">{error}</div>}
                
                {/* Filters Section */}
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
                                onChange={(e) => setSearchText(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: '#252525',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    color: '#e4e4e7',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>
                    </div>
                    
                    <div className="assignments-filters-grid" style={{ marginTop: '15px' }}>
                        <DropdownSelect
                            title="Notas"
                            options={gradeOptions}
                            selectedValues={selectedGrades}
                            onChange={setSelectedGrades}
                            isMulti={true}
                        />
                        <DropdownSelect
                            title="Responsável Atual"
                            options={users}
                            selectedValues={selectedAssignedUsers}
                            onChange={setSelectedAssignedUsers}
                            isMulti={true}
                        />
                        <DropdownSelect
                            title="Status"
                            options={normalizedOptions}
                            selectedValues={selectedNormalized}
                            onChange={setSelectedNormalized}
                            isMulti={true}
                        />
                    </div>
                </div>
                
                {/* Texts Selection Section */}
                <div className="assignments-texts-section">
                    {/* Sticky Header */}
                    <div className="assignments-texts-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 className="assignments-texts-title">Textos Disponíveis</h3>
                            <span className="selected-count-badge">
                                {selectedTextIds.size} de {filteredTexts.length} selecionados
                            </span>
                        </div>
                        <div className="assignments-selection-controls">
                            {/* Select N input */}
                            <div className="select-n-control">
                                <input
                                    type="number"
                                    min="1"
                                    max={filteredTexts.length}
                                    placeholder="N"
                                    value={selectNValue}
                                    onChange={(e) => setSelectNValue(e.target.value)}
                                    className="select-n-input"
                                />
                                <button 
                                    className="selection-btn"
                                    onClick={handleSelectN}
                                    disabled={!selectNValue || parseInt(selectNValue, 10) <= 0 || parseInt(selectNValue, 10) > filteredTexts.length}
                                >
                                    Selecionar N
                                </button>
                            </div>
                            <button className="selection-btn" onClick={handleSelectAll}>
                                Selecionar Todos
                            </button>
                            <button className="selection-btn" onClick={handleDeselectAll}>
                                Desmarcar Todos
                            </button>
                        </div>
                    </div>
                    
                    {/* Scrollable texts list */}
                    <div className="assignments-texts-list">
                        {filteredTexts.length === 0 ? (
                            <p className="no-selection-message">Nenhum texto encontrado com os filtros atuais.</p>
                        ) : (
                            filteredTexts.map(text => (
                                <div
                                    key={text.id}
                                    className={`assignments-text-item ${selectedTextIds.has(text.id) ? 'selected' : ''}`}
                                    onClick={() => handleToggleText(text.id)}
                                >
                                    <input
                                        type="checkbox"
                                        className="assignments-text-checkbox"
                                        checked={selectedTextIds.has(text.id)}
                                        onChange={() => {}}
                                    />
                                    <div className="assignments-text-info">
                                        <span className="assignments-text-name">
                                            {text.sourceFileName || `Texto ${text.id}`}
                                        </span>
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
                
                {/* Users Selection Section */}
                <div className="assignments-users-section">
                    <h3 className="assignments-users-title">Atribuir Para</h3>
                    <DropdownSelect
                        title="Selecione os usuários"
                        options={users}
                        selectedValues={selectedTargetUsers}
                        onChange={setSelectedTargetUsers}
                        isMulti={true}
                    />
                </div>
                
                {/* Assignment Preview */}
                <div className="assignments-preview">
                    <h3 className="assignments-preview-title">Prévia da Distribuição</h3>
                    {assignmentDistribution.length === 0 ? (
                        <p className="no-selection-message">
                            Selecione textos e usuários para ver a distribuição.
                        </p>
                    ) : (
                        <div className="assignments-distribution">
                            {assignmentDistribution.map(item => (
                                <div key={item.username} className="distribution-item">
                                    <span className="distribution-username">{item.username}</span>
                                    <span className="distribution-count">{item.count} textos</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Action Buttons */}
                <div className="assignments-actions">
                    <button className="back-btn" onClick={() => navigate('/main')}>
                        ← Voltar
                    </button>
                    <button
                        className="assign-btn"
                        onClick={handleOpenConfirmModal}
                        disabled={selectedTextIds.size === 0 || selectedTargetUsers.length === 0 || assigning}
                    >
                        {assigning ? 'Atribuindo...' : `Atribuir ${selectedTextIds.size} Textos`}
                    </button>
                </div>
            </div>
            
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="upload-modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirmar Atribuição</h3>
                            <button className="modal-close-button" onClick={() => setShowConfirmModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Você está prestes a atribuir <strong>{selectedTextIds.size} textos</strong> para <strong>{selectedTargetUsers.length} usuário(s)</strong>.</p>
                            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#252525', borderRadius: '8px' }}>
                                <p style={{ color: '#888', marginBottom: '10px' }}>Distribuição:</p>
                                {assignmentDistribution.map(item => (
                                    <p key={item.username} style={{ color: '#e4e4e7' }}>
                                        <span style={{ color: '#3b82f6' }}>{item.username}</span>: {item.count} textos
                                    </p>
                                ))}
                            </div>
                            <p style={{ marginTop: '15px', color: '#888' }}>Deseja continuar?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-button cancel-button" onClick={() => setShowConfirmModal(false)}>
                                Cancelar
                            </button>
                            <button className="modal-button confirm-button valid" onClick={handleConfirmAssign}>
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
