import { formatLocalDate, resolveRelatedName } from '../utils/appointments.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllPages } from '../services/api.js'
import { formatDate, formatStatus } from '../utils/formatters.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

export function AdminAgendaPage() {
  const [date, setDate] = useState(() => formatLocalDate(new Date()))
  const [resourceId, setResourceId] = useState('')
  const [resources, setResources] = useState([])
  const [services, setServices] = useState([])
  const [agenda, setAgenda] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    try {
      setLoading(true); setError('')
      const query = `/agendamentos/?data_inicio=${date}&data_fim=${date}${resourceId ? `&recurso=${resourceId}` : ''}`
      const [items, resourceList, serviceList] = await Promise.all([fetchAllPages(query), fetchAllPages('/recursos/'), fetchAllPages('/servicos/')])
      setAgenda(items.sort((first, second) => new Date(first.inicio) - new Date(second.inicio))); setResources(resourceList); setServices(serviceList)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [date, resourceId])
  return (
    <section className="page-block"><PageHeader title="Agenda do dia" subtitle="Acompanhe os atendimentos do consultório." backLabel="Voltar para administração" backTo="/admin" />
      <div className="date-row"><label>Dia<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Psicólogo<select value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">Todos</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.nome}</option>)}</select></label></div>
      {loading ? <LoadingState message="Consultando agenda" /> : null}{error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}
      {!loading && !error ? <div className="card section-card">{agenda.length ? <div className="list-stack">{agenda.map((item) => { const serviceName = resolveRelatedName(item.servico, services, item.servico_nome || item.nome_servico); const resourceName = resolveRelatedName(item.recurso, resources, item.recurso_nome || item.psicologo_nome); return <Link to={`/admin/sessao/${item.id}`} className="list-item" key={item.id}><div><strong>{serviceName || resourceName || 'Sessão'}</strong><p>{resourceName || 'Psicólogo'} • {item.cliente?.nome || item.cliente_nome || item.paciente?.nome || 'Paciente'} • {formatDate(item.inicio)}</p><p>{item.observacoes || 'Sem observações.'}</p></div><span className="badge">{formatStatus(item.status)}</span></Link> })}</div> : <EmptyState title="Nenhum atendimento neste dia" description="A agenda não possui atendimentos para o filtro selecionado." />}</div> : null}
    </section>
  )
}

export default AdminAgendaPage
