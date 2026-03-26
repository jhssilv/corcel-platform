import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import { authenticateUser } from './api/APIFunctions';
import { useAuth } from './functions/useAuth';
import '../styles/login_page.css';

interface LoginErrorShape {
  error?: string;
  response?: {
    data?: {
      error?: string;
    };
  };
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const loginData = await authenticateUser(username, password);
      login(username, loginData.isAdmin);
      navigate('/main');
    } catch (error) {
      console.error(error);
      const typedError = error as LoginErrorShape;
      alert(typedError.error || typedError.response?.data?.error || 'Login failed');
    }
  };

  return (
    <section>
      <TopBar showSidePanel={false} />
      <h1>Autenticação de usuário</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="username_input"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          required
          placeholder="Usuário"
        />
        <input
          name="password_input"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          required
          placeholder="Senha"
        />
        <button type="submit" style={{ color: 'white' }}>Entrar</button>
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <Link to="/first-access" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
            Primeiro Acesso? Ative sua conta
          </Link>
        </div>
      </form>
    </section>
  );
}

export default LoginPage;
