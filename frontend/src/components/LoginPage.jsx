import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './functions/useAuth.jsx';

import { authenticateUser, getTextsData } from './api/APIFunctions.jsx';

import TopBar from './TopBar.jsx';

import '../styles/login_page.css';

// LOGIN PAGE COMPONENT \\

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    // <> Event handlers <> \\
    const handleUsernameChange = (event) => {
        setUsername(event.target.value);
    };

    const handlePasswordChange = (event) => {
        setPassword(event.target.value);
    };

const handleSubmit = async (event) => {
    event.preventDefault();

    try {
        const login_data = await authenticateUser(username, password); 
    
        login(username, login_data.isAdmin);
        navigate('/main');           

    } catch (error) {
        console.error(error);
        alert(error.error || error.response?.data?.error || 'Login failed');
    }
};

    return (
        <section>
            <TopBar showSidePanel={false}/>
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
