import { useState, type ChangeEvent, type FormEvent } from 'react';
import { registerUser } from '../../Api';
import { Banner, Dialog, DialogHeader, Stack, Button, DialogFooter, FormField } from '../Generic';
import styles from '../../styles/register_user_modal.module.css';

interface RegisterUserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FormMessage {
    text: string;
    type: 'success' | 'error' | '';
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

            <form onSubmit={handleSubmit} className={styles['register-form']}>
                <Stack direction="vertical" gap={12} className={styles['modal-body']}>
                    <Stack direction="vertical" gap={20}>
                        <FormField label="Nome de Usuário" htmlFor="username" required>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
                                required
                                minLength={3}
                            />
                        </FormField>

                        <p className={styles['helper-text']}>
                            O usuário será criado como inativo e escolherá sua senha no primeiro acesso.
                        </p>

                        {message.text && (
                            <Banner variant={message.type === 'error' ? 'danger' : 'success'}>
                                {message.text}
                            </Banner>
                        )}
                    </Stack>
                </Stack>

                <DialogFooter align="right">
                    <Button type="button" tier="secondary" variant="neutral" onClick={handleClose}>
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