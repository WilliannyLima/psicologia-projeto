import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../services/api.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

export function AdminAvailabilityPage({ permissions }) {
  const { id } = useParams()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ dia_semana: '0', hora_inicio: '', hora_fim: '' })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const canAdd = hasPermission(permissions, 'api.add_disponibilidade')
  const canChange = hasPermission(permissions, 'api.change_disponibilidade')
  const canDelete = hasPermission(permissions, 'api.delete_disponibilidade')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      setLoadFailed(false)
      setItems(await fetchAllPages(`/disponibilidades/?recurso=${id}`))
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
    setFieldErrors({})
    if (!form.hora_inicio || !form.hora_fim || form.hora_inicio >= form.hora_fim) {
      setError('Informe um intervalo de horário válido.')
      return
    }
    try {
      setError('')
      await apiRequest(editing ? `/disponibilidades/${editing}/` : '/disponibilidades/', {
        method: editing ? 'PATCH' : 'POST',
        body: { ...form, recurso: id },
      })
      setEditing(null)
      setForm({ dia_semana: '0', hora_inicio: '', hora_fim: '' })
      await load()
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
    }
  }

  const remove = async (item) => {
    if (!window.confirm('Excluir este horário?')) return
    try {
      await apiRequest(`/disponibilidades/${item.id}/`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="page-block">
      <PageHeader title="Horários do psicólogo" subtitle="Gerencie as disponibilidades." backLabel="Voltar para psicólogos" backTo="/admin/psicologos" />
      {error ? <Alert type="danger" message={error} /> : null}
      {loadFailed ? <button type="button" className="button-secondary" onClick={load}>Tentar de novo</button> : null}
      {loading ? <LoadingState message="Carregando horários" /> : null}
      <div className="card section-card">
        <form className="date-row" onSubmit={submit}>
          <label>Dia<select value={form.dia_semana} onChange={(event) => setForm({ ...form, dia_semana: event.target.value })}><option value="0">Domingo</option><option value="1">Segunda-feira</option><option value="2">Terça-feira</option><option value="3">Quarta-feira</option><option value="4">Quinta-feira</option><option value="5">Sexta-feira</option><option value="6">Sábado</option></select>{fieldErrors.dia_semana ? <small className="field-error">{fieldErrors.dia_semana}</small> : null}</label>
          <label>Início<input type="time" value={form.hora_inicio} onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })} />{fieldErrors.hora_inicio ? <small className="field-error">{fieldErrors.hora_inicio}</small> : null}</label>
          <label>Fim<input type="time" value={form.hora_fim} onChange={(event) => setForm({ ...form, hora_fim: event.target.value })} />{fieldErrors.hora_fim ? <small className="field-error">{fieldErrors.hora_fim}</small> : null}</label>
          {fieldErrors.general ? <Alert type="danger" message={fieldErrors.general} /> : null}
          {editing ? (canChange ? <button className="button-primary">Atualizar</button> : null) : (canAdd ? <button className="button-primary">Adicionar</button> : null)}
        </form>
        {!loading && !error && items.length === 0 ? <EmptyState title="Sem horários cadastrados" description="Sem horários: ninguém consegue agendar." /> : null}
        <div className="list-stack">{items.map((item) => <div className="list-item" key={item.id}><span>{['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][item.dia_semana]} • {item.hora_inicio}–{item.hora_fim}</span><div className="meta-actions">{canChange ? <button type="button" className="button-secondary small-button" onClick={() => { setEditing(item.id); setForm({ dia_semana: String(item.dia_semana), hora_inicio: item.hora_inicio, hora_fim: item.hora_fim }) }}>Editar</button> : null}{canDelete ? <button type="button" className="button-ghost small-button" onClick={() => remove(item)}>Excluir</button> : null}</div></div>)}</div>
      </div>
    </section>
  )
}

export default AdminAvailabilityPage
