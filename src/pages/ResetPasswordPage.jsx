import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticationErrorMessage, apiRequest } from '../services/api.js'
import { Alert } from '../components/ui/Alert.jsx'
import { BackButton } from '../components/layout/BackButton.jsx'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await apiRequest('/auth/redefinir-senha/', {
        method: 'POST',
        body: {
          organizacao: 'psicologia',
          email,
        },
      })

      setSuccess('Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.')
      setEmail('')
    } catch (err) {
      setError(authenticationErrorMessage(err, 'Não foi possível solicitar o link de recuperação.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel reset-page">
      <div className="card auth-card">
        <BackButton label="Voltar para login" to="/login" />
        <p className="eyebrow">Acesso</p>
        <h2>Esqueci minha senha</h2>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {error ? <Alert type="danger" message={error} /> : null}
          {success ? <Alert type="success" message={success} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate('/login')}>
            Voltar ao login
          </button>
        </form>
      </div>
    </section>
  )
}

export default ResetPasswordPage
