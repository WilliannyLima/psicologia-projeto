import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import { Erro } from '../components/Erro.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'

export function AlterarSenha() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ senha_atual: '', nova_senha: '', confirmacao: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextFieldErrors = {}

    if (!form.senha_atual) nextFieldErrors.senha_atual = 'Informe sua senha atual.'
    if (!form.nova_senha) nextFieldErrors.nova_senha = 'Informe a nova senha.'
    if (form.nova_senha !== form.confirmacao) {
      nextFieldErrors.confirmacao = 'A confirmação deve ser igual à nova senha.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setLoading(true)
    setError('')
    setFieldErrors({})

    try {
      await apiRequest('/auth/alterar-senha/', {
        method: 'POST',
        body: {
          senha_atual: form.senha_atual,
          nova_senha: form.nova_senha,
        },
      })
      navigate('/perfil', { replace: true, state: { message: 'Senha alterada' } })
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-block">
      <CabecalhoPagina
        title="Alterar senha"
        subtitle="Atualize sua senha para manter sua conta segura."
        backLabel="Voltar para o perfil"
        backTo="/perfil"
      />
      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSubmit} noValidate>
          <label>
            Senha atual
            <input type="password" name="senha_atual" value={form.senha_atual} onChange={handleChange} />
            {fieldErrors.senha_atual ? <small className="field-error">{fieldErrors.senha_atual}</small> : null}
          </label>
          <label>
            Nova senha
            <input type="password" name="nova_senha" value={form.nova_senha} onChange={handleChange} />
            {fieldErrors.nova_senha ? <small className="field-error">{fieldErrors.nova_senha}</small> : null}
          </label>
          <label>
            Confirmação da nova senha
            <input type="password" name="confirmacao" value={form.confirmacao} onChange={handleChange} />
            {fieldErrors.confirmacao ? <small className="field-error">{fieldErrors.confirmacao}</small> : null}
          </label>
          {error ? <Erro type="danger" message={error} /> : null}
          <div className="meta-actions">
            <button type="submit" className="button-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" className="button-secondary" onClick={() => navigate('/perfil')} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default AlterarSenha
