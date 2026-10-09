import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { requireProfileResponse, apiRequest } from '../services/api.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { ProfilePhotoUpload } from '../components/forms/ProfilePhotoUpload.jsx'

export function ProfilePage({ profile, onLogout, onProfileChange }) {
  const location = useLocation()
  const [form, setForm] = useState({ nome: profile?.nome || '', email: profile?.email || '' })
  const [profileLoading, setProfileLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const profileRequestIdRef = useRef(0)
  const saveInProgressRef = useRef(false)
  const loadProfile = async () => {
    if (saveInProgressRef.current || photoSaving) return
    const requestId = ++profileRequestIdRef.current
    try {
      setProfileLoading(true)
      setLoadFailed(false)
      setError('')
      const response = requireProfileResponse(await apiRequest('/auth/eu/'))
      if (requestId !== profileRequestIdRef.current) return
      onProfileChange(response)
      setForm({ nome: response?.nome || '', email: response?.email || '' })
    } catch (err) {
      if (requestId === profileRequestIdRef.current) {
        setError(err.message)
        setLoadFailed(true)
      }
    } finally {
      if (requestId === profileRequestIdRef.current) setProfileLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  const organizationName =
    profile?.organizacao?.nome ||
    profile?.organizacao_nome ||
    profile?.negocio?.nome ||
    'Psicologia'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
    setError('')
    setSuccess('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (profileLoading || photoSaving || saving || saveInProgressRef.current) return
    const nome = form.nome.trim()
    setLoadFailed(false)
    setError('')
    setSuccess('')
    setFieldErrors({})
    if (!nome) {
      setFieldErrors({ nome: 'Este campo é obrigatório.' })
      return
    }

    profileRequestIdRef.current += 1
    saveInProgressRef.current = true
    setSaving(true)

    try {
      const response = requireProfileResponse(await apiRequest('/auth/eu/', {
        method: 'PATCH',
        body: { nome },
      }))
      onProfileChange(response)
      setForm((current) => ({ ...current, nome: response.nome, email: response.email || current.email }))
      setSuccess('Seus dados foram atualizados com sucesso.')
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
    } finally {
      saveInProgressRef.current = false
      setSaving(false)
    }
  }

  return (
    <section className="page-block">
      <PageHeader
        title="Meu perfil"
        subtitle="Atualize seus dados e mantenha seu cadastro em dia."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />
      {location.state?.message ? <Alert type="success" message={location.state.message} /> : null}
      {profileLoading ? <LoadingState message="Carregando perfil" /> : null}
      {error ? <><Alert type="danger" message={error} />{loadFailed ? <button type="button" className="button-secondary" onClick={loadProfile}>Tentar de novo</button> : null}</> : null}
      {success ? <Alert type="success" message={success} /> : null}

      <div className="card section-card">
        <ProfilePhotoUpload
          profile={profile}
          onProfileChange={onProfileChange}
          onLoadingChange={setPhotoSaving}
          disabled={profileLoading || saving || photoSaving}
        />
      </div>

      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSave}>
          <label>
            Nome
            <input name="nome" value={form.nome} onChange={handleChange} disabled={profileLoading || saving || photoSaving} required />
            {fieldErrors.nome ? <small className="field-error">{fieldErrors.nome}</small> : null}
          </label>
          <label>
            E-mail
            <input name="email" type="email" value={form.email} onChange={handleChange} disabled />
          </label>

          <button type="submit" className="button-primary" disabled={profileLoading || saving || photoSaving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      <div className="card section-card">
        <p className="eyebrow">Conta</p>
        <p><strong>Organização:</strong> {organizationName}</p>
        <div className="meta-actions">
          <Link to="/alterar-senha" className="button-secondary">Alterar senha</Link>
          <button type="button" className="button-ghost" onClick={onLogout}>Sair</button>
        </div>
      </div>
    </section>
  )
}

export default ProfilePage
