import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticationErrorMessage } from '../api/client.js'
import { Erro } from '../components/Erro.jsx'
import { useAuth } from '../AuthContext.js'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ organizacao: 'psicologia', email: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { profile } = await login(form)
      navigate(profile.permissoes?.includes('api.change_organizacao') ? '/admin' : '/dashboard')
    } catch (err) {
      if (err.status === 400) {
        setError('Organização, e-mail ou senha inválidos')
      } else {
        setError(authenticationErrorMessage(err, 'Não foi possível entrar. Verifique seu e-mail e senha.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-layout login-page">
      <button type="button" className="login-back-button" onClick={() => navigate('/')}>
        <span aria-hidden="true">←</span> Voltar para o início
      </button>
      <div className="card auth-card">
        <div className="login-brand">
          <span className="landing-lotus" aria-hidden="true">✦</span>
          <span><strong>Espaço Acolher</strong><small>PSICOLOGIA</small></span>
        </div>
        <p className="login-kicker">Sua jornada continua</p>
        <h2>Bem-vindo de volta!</h2>
        <p className="login-intro">Entre com sua conta para continuar.</p>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="seuemail@exemplo.com"
              required
            />
          </label>
          <label>
            Senha
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="senha"
                value={form.senha}
                onChange={handleChange}
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
          </label>

          {error ? <Erro type="danger" message={error} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-links">
          <Link className="forgot-link" to="/esqueci-minha-senha">Esqueci minha senha</Link>
          <p>Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link></p>
        </div>
      </div>
      <div className="login-orb login-orb-one" aria-hidden="true" />
      <div className="login-orb login-orb-two" aria-hidden="true" />
    </section>
  )
}

export default Login
