import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../AuthContext.js'
import { hasPermission, apiRequest } from '../../api/client.js'
import { Erro } from '../../components/Erro.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'

export function FormularioPsicologo() {
  const { profile } = useAuth()
  const permissions = profile?.permissoes
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [form, setForm] = useState({ nome: '', bio: '', capacidade: '', ativo: true })
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const [fields, setFields] = useState({})
  const canEdit = hasPermission(permissions, editing ? 'api.change_recurso' : 'api.add_recurso')

  const load = async () => {
    if (!editing) return
    try {
      setLoading(true)
      setLoadFailed(false)
      setError('')
      const item = await apiRequest(`/recursos/${id}/`)
      setForm({ nome: item.nome || '', bio: item.bio || '', capacidade: item.capacidade ?? '', ativo: item.ativo !== false })
    } catch (err) {
      setError(err.message)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const submit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      setFields({})
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => body.append(key, value))
      if (photo) body.append('foto', photo)
      await apiRequest(editing ? `/recursos/${id}/` : '/recursos/', { method: editing ? 'PATCH' : 'POST', body })
      navigate('/admin/psicologos')
    } catch (err) {
      setError(err.message)
      setFields(err.fields || {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-block">
      <CabecalhoPagina title={editing ? 'Editar psicólogo' : 'Novo psicólogo'} subtitle="Preencha os dados do profissional." backLabel="Voltar para psicólogos" backTo="/admin/psicologos" />
      {loading ? <Carregando message="Carregando psicólogo" /> : null}
      {loadFailed ? <><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}
      <div className="card section-card">
        <form className="stack-form" onSubmit={submit}>
          <label>Nome<input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} disabled={!canEdit} />{fields.nome ? <small className="field-error">{fields.nome}</small> : null}</label>
          <label>Bio<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} disabled={!canEdit} />{fields.bio ? <small className="field-error">{fields.bio}</small> : null}</label>
          <label>Capacidade<input type="number" value={form.capacidade} onChange={(event) => setForm({ ...form, capacidade: event.target.value })} disabled={!canEdit} />{fields.capacidade ? <small className="field-error">{fields.capacidade}</small> : null}</label>
          <label>Foto<input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} disabled={!canEdit} />{fields.foto ? <small className="field-error">{fields.foto}</small> : null}</label>
          <label><input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} disabled={!canEdit} /> Ativo</label>
          {fields.general ? <Erro type="danger" message={fields.general} /> : null}
          {error && !loadFailed ? <Erro type="danger" message={error} /> : null}
          {canEdit ? <button className="button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button> : null}
        </form>
      </div>
    </section>
  )
}

export default FormularioPsicologo
