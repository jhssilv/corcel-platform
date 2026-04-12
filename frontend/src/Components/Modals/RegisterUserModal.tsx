import { useState, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { registerUser } from '../../Api';
import { Dialog, DialogHeader, Stack, Button, DialogFooter } from '../Generic';
import styles from '../../styles/register_user_modal.module.css';

interface RegisterUserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FormMessage {
    text: string;
    type: 'success' | 'error' | '';
}

interface ApiErrorShape {
    error?: string;
}

function RegisterUserModal({ isOpen, onClose }: RegisterUserModalProps) {
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<FormMessage>({ text: '', type: '' });

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await registerUser(username);
            setMessage({ text: response.message || 'Usuário criado com sucesso!', type: 'success' });
            setUsername('');
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Erro ao registrar usuário.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setUsername('');
        setMessage({ text: '', type: '' });
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} className={styles['register-modal']}>
            <DialogHeader onClose={handleClose}>Registrar Novo Usuário</DialogHeader>

            <form onSubmit={handleSubmit} className={styles['register-form']} style={{ display: 'flex', flexDirection: 'column' }}>
                <Stack direction="vertical" gap={12} className={styles['modal-body']}>
                    <Stack direction="vertical" gap={20}>
                        <Stack direction="vertical" gap={8} className={styles['form-group']}>
                            <label htmlFor="username">Nome de Usuário</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
                                required
                                minLength={3}
                            />
                        </Stack>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                            O usuário será criado como inativo e escolherá sua senha no primeiro acesso.
                        </p>

                        {message.text && <div className={[styles.message, styles[message.type]].join(' ')}>{message.text}</div>}
                    </Stack>
                </Stack>

                <DialogFooter align="right">
                    <Button variant="action" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        tier="primary"
                        variant="action"
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                    >
                        Criar Usuário
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}

export default RegisterUserModal;