import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { activateUser } from '../Api';
import { Banner, Button, Card, CardTitle, FormField, Stack } from '../Components/Generic';
import styles from './first_access_page.module.css';

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
        <div className={styles.container}>
            <Card className={styles.card}>
                <CardTitle>Primeiro Acesso</CardTitle>
                <div className={styles.content}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <Stack direction="vertical" gap={14}>
                            <FormField label="Nome de Usuário" htmlFor="username" required>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
                                    required
                                />
                            </FormField>

                            <FormField label="Nova Senha" htmlFor="password" required>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                                    required
                                    minLength={6}
                                />
                            </FormField>

                            <FormField label="Confirmar Senha" htmlFor="confirmPassword" required>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                                    required
                                    minLength={6}
                                />
                            </FormField>

                            {message.text && (
                                <Banner
                                    variant={message.type === 'error' ? 'danger' : 'success'}
                                    data-testid="first-access-message"
                                    data-message-type={message.type}
                                >
                                    {message.text}
                                </Banner>
                            )}

                            <Button
                                type="submit"
                                tier="primary"
                                variant="action"
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                            >
                                {isSubmitting ? 'Ativando...' : 'Ativar Conta'}
                            </Button>

                            <div className={styles.backLinkContainer}>
                                <Link to="/" className={styles.backLink}>
                                    Voltar para Login
                                </Link>
                            </div>
                        </Stack>
                    </form>
                </div>
            </Card>
        </div>
    );
}

export default FirstAccessPage;