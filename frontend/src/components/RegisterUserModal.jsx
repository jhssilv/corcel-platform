import { useState } from "react"
import PropTypes from "prop-types"
import { registerUser } from "./api/APIFunctions"

function RegisterUserModal({ isOpen, onClose }) {
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ text: "", type: "" })

    try {
      const response = await registerUser(username)
      setMessage({ text: response.message || "Usuário criado com sucesso!", type: "success" })
      setUsername("")
    } catch (error) {
      setMessage({ text: error.error || "Erro ao registrar usuário.", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setUsername("")
    setMessage({ text: "", type: "" })
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
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
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                O usuário será criado como inativo e escolherá sua senha no primeiro acesso.
              </p>

              {message.text && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
                <button type="button" className="modal-button cancel-button" onClick={handleClose}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="modal-button confirm-button valid"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

RegisterUserModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default RegisterUserModal
