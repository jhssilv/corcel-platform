import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../Components/Layout/TopBar';
import { getUsersData, toggleUserActive, toggleUserAdmin } from '../Api';
import { useAuth } from '../Context/Auth/UseAuth';
import { useSnackbar } from '../Context/Generic';
import { Dialog, DialogHeader, Card, Stack, Button, DialogFooter, FormField, SectionHeader } from '../Components/Generic';
import type { UserData } from '../types';
import '../styles/main_page.css';
import '../styles/user_management.css';

function UserManagementDashboard() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [confirmAdminToggle, setConfirmAdminToggle] = useState<string | null>(null);

    const { username: currentUsername } = useAuth();
    const navigate = useNavigate();
    const { addSnackbar } = useSnackbar();

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getUsersData();
            setUsers(data);
            setFilteredUsers(data);
        } catch (fetchError) {
            console.error(fetchError);
            addSnackbar({
                text: 'Failed to load users.',
                type: 'error',
                duration: 5000
            });
        } finally {
            setLoading(false);
        }
    }, [addSnackbar]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            setFilteredUsers(users.filter((user) => user.username.toLowerCase().includes(lower)));
            return;
        }

        setFilteredUsers(users);
    }, [searchTerm, users]);

    const handleToggleActive = async (username: string) => {
        if (username === currentUsername) {
            return;
        }

        try {
            await toggleUserActive(username);
            await fetchUsers();
            addSnackbar({ text: `Status de '${username}' atualizado com sucesso.`, type: 'success' });
        } catch (err) {
            console.error('Failed to toggle active status', err);
            addSnackbar({
                text: 'Failed to toggle active status',
                type: 'error',
            });
        }
    };

    const handleToggleAdmin = async () => {
        if (!confirmAdminToggle) {
            return;
        }

        try {
            await toggleUserAdmin(confirmAdminToggle);
            const userRef = confirmAdminToggle;
            setConfirmAdminToggle(null);
            await fetchUsers();
            addSnackbar({ text: `Privilégios de '${userRef}' atualizados com sucesso.`, type: 'success' });
        } catch (err) {
            console.error('Failed to toggle admin status', err);
            addSnackbar({
                text: 'Failed to toggle admin status',
                type: 'error',
            });
            setConfirmAdminToggle(null);
        }
    };

    return (
        <div className="main-page-container">
            <TopBar showSidePanel={true} />

            <div className="main-page-section user-management-section">
                <SectionHeader
                    heading={<span style={{ textTransform: 'none' }}>Gerenciamento de Usuários</span>}
                    actions={(
                        <Button onClick={() => navigate('/main')} tier="secondary" variant="neutral">
                            Voltar
                        </Button>
                    )}
                />

                <Card>
                    <Stack direction="vertical" gap={20} className="user-management-content">
                        <FormField label="Buscar usuário" htmlFor="user-management-search-input">
                            <input
                                id="user-management-search-input"
                                type="text"
                                placeholder="Buscar usuário..."
                                value={searchTerm}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
                                className="user-management-search"
                            />
                        </FormField>

                        {loading ? (
                            <p>Carregando...</p>
                        ) : (
                            <div className="user-management-table-container">
                                <table className="user-management-table">
                                    <thead>
                                        <tr>
                                            <th>Usuário</th>
                                            <th>Último Login</th>
                                            <th>Admin</th>
                                            <th>Ativo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user) => (
                                            <tr key={user.username}>
                                                <td>{user.username}</td>
                                                <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}</td>
                                                <td>
                                                    <button
                                                        onClick={() => setConfirmAdminToggle(user.username)}
                                                        disabled={user.username === currentUsername}
                                                        className={`${user.isAdmin ? 'status-btn-active' : 'status-btn-inactive'} ${user.username === currentUsername ? 'status-btn-disabled' : ''}`}
                                                    >
                                                        {user.isAdmin ? 'Sim' : 'Não'}
                                                    </button>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => {
                                                            void handleToggleActive(user.username);
                                                        }}
                                                        disabled={user.username === currentUsername}
                                                        className={`${user.isActive ? 'status-btn-active' : 'status-btn-danger'} ${user.username === currentUsername ? 'status-btn-disabled' : ''}`}
                                                    >
                                                        {user.isActive ? 'Ativo' : 'Inativo'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Stack>
                </Card>
            </div>

            {confirmAdminToggle && (
                <Dialog isOpen={!!confirmAdminToggle} onClose={() => setConfirmAdminToggle(null)} className="upload-modal user-management-confirm-modal">
                    <DialogHeader onClose={() => setConfirmAdminToggle(null)}>Confirmar Alteração</DialogHeader>
                    <Stack direction="vertical" gap={12} className="modal-body user-management-confirm-content">
                        <p>
                            Tem certeza que deseja alterar o status de administrador para <strong>{confirmAdminToggle}</strong>?
                        </p>
                    </Stack>
                    <DialogFooter>
                        <Button tier="secondary" variant="neutral" onClick={() => setConfirmAdminToggle(null)}>
                            Cancelar
                        </Button>
                        <Button
                            tier="primary"
                            variant="action"
                            onClick={() => {
                                void handleToggleAdmin();
                            }}
                        >
                            Confirmar
                        </Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
}

export default UserManagementDashboard;