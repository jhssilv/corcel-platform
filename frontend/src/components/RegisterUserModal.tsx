import { useState, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { registerUser } from './api/APIFunctions';

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
      const typedError = error as ApiErrorShape;
      setMessage({ text: typedError.error || 'Erro ao registrar usuário.', type: 'error' });
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
    <div className="modal-overlay" onClick={handleClose}>
      <div className="upload-modal" onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Registrar Novo Usuário</h2>
          <button className="modal-close-button" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
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

            {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="modal-button cancel-button" onClick={handleClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="modal-button confirm-button valid"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterUserModal;