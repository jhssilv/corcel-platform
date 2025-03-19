import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './functions/useAuth.jsx';
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
            
        const payload = {
            username: username,
            password: password,
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Invalid username or password');
            }

            const data = await response.json();
            localStorage.setItem('essayIndexes', JSON.stringify(data.essayIndexes));
            localStorage.setItem('loggedUser', username);
            console.log('Olá ', username);
            login();
            navigate('/main');

        } catch (error) {
            console.error(error);
        }
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
