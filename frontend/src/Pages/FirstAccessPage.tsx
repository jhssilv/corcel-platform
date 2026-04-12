import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { activateUser } from '../Api';
import { Card, CardTitle } from '../Components/Generic';
import '../styles/login_page.css';

interface MessageState {
    text: string;
    type: 'success' | 'error' | '';
}

interface ApiErrorShape {
    error?: string;
}

function FirstAccessPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage({ text: '', type: '' });

        if (password !== confirmPassword) {
            setMessage({ text: 'As senhas não coincidem.', type: 'error' });
            return;
        }

        setIsSubmitting(true);

        try {
            await activateUser(username, password);
            setMessage({ text: 'Conta ativada com sucesso! Redirecionando...', type: 'success' });
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Erro ao ativar conta.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <Card className="login-box" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                <CardTitle className="login-title">Primeiro Acesso</CardTitle>
                <div style={{ padding: '20px' }}>
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label htmlFor="username" style={{ display: 'block', marginBottom: '5px' }}>Nome de Usuário</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Nova Senha</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px' }}>Confirmar Senha</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        {message.text && (
                            <div
                                className={`message ${message.type}`}
                                data-testid="first-access-message"
                                data-message-type={message.type}
                                role="status"
                            >
                                {message.text}
                            </div>
                        )}

                        <button type="submit" className="login-button" disabled={isSubmitting} style={{ color: 'white' }}>
                            {isSubmitting ? 'Ativando...' : 'Ativar Conta'}
                        </button>

                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                            <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
                                Voltar para Login
                            </Link>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
}

export default FirstAccessPage;