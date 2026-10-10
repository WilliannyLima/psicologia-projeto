import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAllPages } from '../../api/client.js'
import { filterProcessedAppointments, getAppointmentPatientName, deduplicateAppointments, PROCESSED_APPOINTMENT_STATUSES } from '../../utils/requestHistory.js'
import { resolveRelatedName } from '../../utils/appointments.js'
import { formatDate, formatStatus } from '../../utils/formatters.js'
import { Erro } from '../../components/Erro.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'
import { EstadoVazio } from '../../components/EstadoVazio.jsx'

export function HistoricoSolicitacoes() {
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [resources, setResources] = useState([])
  const [filters, setFilters] = useState({ status: 'todos', patient: '', date: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [appointmentList, serviceList, resourceList] = await Promise.all([
        fetchAllPages('/agendamentos/', { strict: true }),
        fetchAllPages('/servicos/', { strict: true }),
        fetchAllPages('/recursos/', { strict: true }),
      ])
      const processed = deduplicateAppointments(appointmentList)
        .filter((item) => PROCESSED_APPOINTMENT_STATUSES.includes(item.status))
        .sort((first, second) => new Date(second.inicio) - new Date(first.inicio))
      setAppointments(processed)
      setServices(serviceList)
      setResources(resourceList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visibleAppointments = useMemo(
    () => filterProcessedAppointments(appointments, filters),
    [appointments, filters],
  )

  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }))

  return (
    <section className="page-block">
      <CabecalhoPagina
        title="Histórico de solicitações"
        subtitle="Consulte os pedidos já processados e a situação atual de cada sessão."
        backLabel="Voltar aos pedidos pendentes"
        backTo="/admin/solicitacoes"
      />

      <div className="card section-card">
        <div className="date-row">
          <label>
            Situação
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="todos">Todas</option>
              <option value="confirmado">Confirmados</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </label>
          <label>
            Nome do paciente
            <input type="search" value={filters.patient} onChange={(event) => updateFilter('patient', event.target.value)} placeholder="Buscar paciente" />
          </label>
          <label>
            Data do agendamento
            <input type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} />
          </label>
        </div>
      </div>

      {loading ? <Carregando message="Carregando histórico" /> : null}
      {error ? <><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}

      {!loading && !error ? (
        <div className="card section-card">
          {visibleAppointments.length === 0 ? (
            <EstadoVazio title="Nenhuma solicitação encontrada" description="Não há registros para os filtros selecionados." />
          ) : (
            <div className="list-stack">
              {visibleAppointments.map((item) => {
                const serviceName = resolveRelatedName(item.servico, services, item.servico_nome || item.nome_servico)
                const resourceName = resolveRelatedName(item.recurso, resources, item.recurso_nome || item.psicologo_nome)
                return (
                  <article className="list-item" key={item.id}>
                    <div>
                      <strong>{getAppointmentPatientName(item)}</strong>
                      <p>{resourceName || 'Psicólogo'} • {serviceName || 'Serviço'}</p>
                      <p>Agendamento: {formatDate(item.inicio)}</p>
                      {item.observacoes ? <p>{item.observacoes}</p> : null}
                    </div>
                    <span className="badge">{formatStatus(item.status)}</span>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}

export default HistoricoSolicitacoes
