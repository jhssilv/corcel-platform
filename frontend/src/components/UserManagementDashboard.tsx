import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import { getUsersData, toggleUserActive, toggleUserAdmin } from './api/APIFunctions';
import { useAuth } from './functions/useAuth';
import type { UserData } from '../types';
import '../styles/main_page.css';

function UserManagementDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAdminToggle, setConfirmAdminToggle] = useState<string | null>(null);

  const { username: currentUsername } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsersData();
      setUsers(data);
      setFilteredUsers(data);
    } catch (fetchError) {
      setError('Failed to load users.');
      console.error(fetchError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

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
    } catch {
      alert('Failed to toggle active status');
    }
  };

  const handleToggleAdmin = async () => {
    if (!confirmAdminToggle) {
      return;
    }

    try {
      await toggleUserAdmin(confirmAdminToggle);
      setConfirmAdminToggle(null);
      await fetchUsers();
    } catch {
      alert('Failed to toggle admin status');
    }
  };

  return (
    <div className="main-page-container">
      <TopBar showSidePanel={true} />

      <div className="main-page-section" style={{ marginTop: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Gerenciamento de Usuários</h2>
          <button onClick={() => navigate('/main')} className="modal-button cancel-button">
            Voltar
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar usuário..."
          value={searchTerm}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
          style={{ width: '100%', marginBottom: '20px', padding: '10px' }}
        />

        {loading ? (
          <p>Carregando...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e4e4e7' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Usuário</th>
                  <th style={{ padding: '10px' }}>Último Login</th>
                  <th style={{ padding: '10px' }}>Admin</th>
                  <th style={{ padding: '10px' }}>Ativo</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.username} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '10px' }}>{user.username}</td>
                    <td style={{ padding: '10px' }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}</td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => setConfirmAdminToggle(user.username)}
                        disabled={user.username === currentUsername}
                        style={{
                          backgroundColor: user.isAdmin ? '#4caf50' : '#333',
                          opacity: user.username === currentUsername ? 0.5 : 1,
                        }}
                      >
                        {user.isAdmin ? 'Sim' : 'Não'}
                      </button>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => {
                          void handleToggleActive(user.username);
                        }}
                        disabled={user.username === currentUsername}
                        style={{
                          backgroundColor: user.isActive ? '#4caf50' : '#f44336',
                          opacity: user.username === currentUsername ? 0.5 : 1,
                        }}
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
      </div>

      {confirmAdminToggle && (
        <div className="modal-overlay">
          <div className="upload-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirmar Alteração</h3>
              <button className="modal-close-button" onClick={() => setConfirmAdminToggle(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Tem certeza que deseja alterar o status de administrador para <strong>{confirmAdminToggle}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel-button" onClick={() => setConfirmAdminToggle(null)}>
                Cancelar
              </button>
              <button
                className="modal-button confirm-button valid"
                onClick={() => {
                  void handleToggleAdmin();
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

export default UserManagementDashboard;