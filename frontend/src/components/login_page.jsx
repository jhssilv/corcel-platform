import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './functions/useAuth.jsx';

import { authenticateUser } from './functions/api_functions.jsx';

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
            
        const data = await authenticateUser(username, password);

        if (data.userId === undefined) {
            alert(data.message);
            return;
        }

        localStorage.setItem('essayIndexes', JSON.stringify(data.essayIndexes));

        console.log('Olá ', username);
        login(data.userId, username);
        navigate('/main');           
        alert(data.message);
    };

    return (
        <section>
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
                <button type="submit">Entrar</button>
            </form>
        </section>
    );
}

export default LoginPage;
