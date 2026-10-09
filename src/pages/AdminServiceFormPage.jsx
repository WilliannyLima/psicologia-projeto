import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../services/api.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'

export function AdminServiceFormPage({ permissions }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [resources, setResources] = useState([])
  const [form, setForm] = useState({ nome: '', descricao: '', duracao_min: '', preco: '', ativo: true, recursos: [] })
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const [fields, setFields] = useState({})
  const canEdit = hasPermission(permissions, editing ? 'api.change_servico' : 'api.add_servico')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      setLoadFailed(false)
      const [resourceResponse, service] = await Promise.all([
        fetchAllPages('/recursos/'),
        editing ? apiRequest(`/servicos/${id}/`) : Promise.resolve(null),
      ])
      setResources(resourceResponse)
      if (service) {
        setForm({
          nome: service.nome || '',
          descricao: service.descricao || '',
          duracao_min: service.duracao_min ?? '',
          preco: service.preco ?? '',
          ativo: service.ativo !== false,
          recursos: (service.recursos || service.recursos_ids || []).map((resource) => resource.id || resource),
        })
      }
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
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach((item) => body.append(key, item))
        else body.append(key, value)
      })
      if (image) body.append('imagem', image)
      await apiRequest(editing ? `/servicos/${id}/` : '/servicos/', { method: editing ? 'PATCH' : 'POST', body })
      navigate('/admin/servicos')
    } catch (err) {
      setError(err.message)
      setFields(err.fields || {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-block">
      <PageHeader title={editing ? 'Editar serviço' : 'Novo serviço'} subtitle="Configure os dados do serviço." backLabel="Voltar para serviços" backTo="/admin/servicos" />
      {loading ? <LoadingState message="Carregando serviço" /> : null}
      {loadFailed ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}
      <div className="card section-card">
        <form className="stack-form" onSubmit={submit}>
          <label>Nome<input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} disabled={!canEdit} />{fields.nome ? <small className="field-error">{fields.nome}</small> : null}</label>
          <label>Descrição<textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} disabled={!canEdit} />{fields.descricao ? <small className="field-error">{fields.descricao}</small> : null}</label>
          <label>Duração<input type="number" value={form.duracao_min} onChange={(event) => setForm({ ...form, duracao_min: event.target.value })} disabled={!canEdit} />{fields.duracao_min ? <small className="field-error">{fields.duracao_min}</small> : null}</label>
          <label>Preço<input type="number" step="0.01" value={form.preco} onChange={(event) => setForm({ ...form, preco: event.target.value })} disabled={!canEdit} />{fields.preco ? <small className="field-error">{fields.preco}</small> : null}</label>
          <label>Imagem<input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} disabled={!canEdit} />{fields.imagem ? <small className="field-error">{fields.imagem}</small> : null}</label>
          <label><input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} disabled={!canEdit} /> Ativo</label>
          <fieldset><legend>Psicólogos</legend>{resources.length ? resources.map((resource) => <label key={resource.id}><input type="checkbox" checked={form.recursos.includes(resource.id)} onChange={(event) => setForm({ ...form, recursos: event.target.checked ? [...form.recursos, resource.id] : form.recursos.filter((value) => value !== resource.id) })} disabled={!canEdit} /> {resource.nome}</label>) : <p className="muted">Nenhum psicólogo cadastrado.</p>}{fields.recursos ? <small className="field-error">{fields.recursos}</small> : null}</fieldset>
          {fields.general ? <Alert type="danger" message={fields.general} /> : null}
          {error && !loadFailed ? <Alert type="danger" message={error} /> : null}
          {canEdit ? <button className="button-primary" disabled={saving || loading}>{saving ? 'Salvando...' : 'Salvar'}</button> : null}
        </form>
      </div>
    </section>
  )
}

export default AdminServiceFormPage
