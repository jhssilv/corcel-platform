import { useState, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { registerUser } from '../../Api';
import { Dialog, DialogHeader } from '../Generic';
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

            <div className={styles['modal-body']}>
                <form onSubmit={handleSubmit} className={styles['register-form']}>
                    <div className={styles['form-group']}>
                        <label htmlFor="username">Nome de Usuário</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
                            required
                            minLength={3}
                        />
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                        O usuário será criado como inativo e escolherá sua senha no primeiro acesso.
                    </p>

                    {message.text && <div className={[styles.message, styles[message.type]].join(' ')}>{message.text}</div>}

                    <div className={styles['modal-footer']} style={{ padding: 0, marginTop: '20px' }}>
                        <button type="button" className={[styles['modal-button'], styles['cancel-button']].join(' ')} onClick={handleClose}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={[styles['modal-button'], styles['confirm-button'], styles.valid].join(' ')}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Criando...' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}

export default RegisterUserModal;