import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticationErrorMessage } from '../api/client.js'
import { Erro } from '../components/Erro.jsx'
import { useAuth } from '../AuthContext.js'

export function Cadastro() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ organizacao: 'psicologia', nome: '', email: '', senha: '', confirmacao: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))

    if (fieldErrors[name]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[name]
        return next
      })
    }

    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = {}
    const nome = form.nome.trim()
    const email = form.email.trim()
    const senha = form.senha.trim()

    if (!nome) validationErrors.nome = 'Este campo é obrigatório.'
    if (!email) validationErrors.email = 'Este campo é obrigatório.'
    if (!senha) validationErrors.senha = 'Este campo é obrigatório.'
    if (form.senha !== form.confirmacao) validationErrors.confirmacao = 'As senhas não coincidem.'

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    setFieldErrors({})

    try {
      await register({ organizacao: form.organizacao, nome, email, senha })
      setSuccess('Conta criada com sucesso! Redirecionando...')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const apiFields = err?.fields || {}

      if (Object.keys(apiFields).length > 0) {
        setFieldErrors(apiFields)
        setError('')
      } else {
        setFieldErrors({})
        setError(authenticationErrorMessage(
          err,
          'Não foi possível criar a conta. A API exige um campo que não está presente no formulário.',
        ))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel register-layout register-page">
      <div className="card auth-card">
        <div className="register-brand">
          <span className="landing-lotus" aria-hidden="true">✦</span>
          <span><strong>Espaço Acolher</strong><small>PSICOLOGIA</small></span>
        </div>
        <p className="eyebrow">Comece sua jornada</p>
        <h2>Crie sua conta</h2>
        <p className="register-intro">Preencha os dados para começar sua jornada.</p>
        <form onSubmit={handleSubmit} className="stack-form" noValidate>
          <label>
            Nome completo
            <input name="nome" value={form.nome} onChange={handleChange} placeholder="Como podemos chamar você?" required />
            {fieldErrors.nome ? <small className="field-error">{fieldErrors.nome}</small> : null}
          </label>
          <label>
            E-mail
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="seuemail@exemplo.com" required />
            {fieldErrors.email ? <small className="field-error">{fieldErrors.email}</small> : null}
          </label>
          <label>
            Senha
            <input type="password" name="senha" value={form.senha} onChange={handleChange} placeholder="Crie uma senha segura" required />
            {fieldErrors.senha ? <small className="field-error">{fieldErrors.senha}</small> : null}
          </label>
          <label>
            Confirmar senha
            <input type="password" name="confirmacao" value={form.confirmacao} onChange={handleChange} placeholder="Digite sua senha novamente" required />
            {fieldErrors.confirmacao ? <small className="field-error">{fieldErrors.confirmacao}</small> : null}
          </label>

          {fieldErrors.general ? <Erro type="danger" message={fieldErrors.general} /> : null}
          {success ? <Erro type="success" message={success} /> : null}
          {error ? <Erro type="danger" message={error} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p className="register-login-link">Já tem uma conta? <Link to="/login">Entrar</Link></p>
      </div>
      <aside className="register-aside" aria-label="Mensagem de acolhimento">
        <span className="auth-symbol" aria-hidden="true">✦</span>
        <p className="eyebrow">Um começo gentil</p>
        <h1>Um espaço para cuidar de você.</h1>
        <p>Crie sua conta para encontrar apoio, organizar seus momentos e acompanhar sua jornada com tranquilidade.</p>
        <span className="auth-aside-note">Cuidado, escuta e presença.</span>
      </aside>
    </section>
  )
}

export default Cadastro
