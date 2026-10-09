import { useAuth } from '../AuthContext.js'
import { formatLocalDate, resolveRelatedName } from '../utils/appointments.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../api/client.js'
import { formatDate } from '../utils/formatters.js'
import { Erro } from '../components/Erro.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { Carregando } from '../components/Carregando.jsx'
import { EstadoVazio } from '../components/EstadoVazio.jsx'
import { ListaSessoes } from '../components/ListaSessoes.jsx'
import { SessaoItem } from '../components/SessaoItem.jsx'

export function MinhasSessoes() {
  const { profile } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [serviceOptions, setServiceOptions] = useState([])
  const [resourceOptions, setResourceOptions] = useState([])
  const [lookupError, setLookupError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('upcoming')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const appointmentsRequestId = useRef(0)
  const appendRequestInProgress = useRef(false)

  const loadAppointments = async (nextTab = tab, page = 1, append = false) => {
    if (append && appendRequestInProgress.current) return
    const requestId = ++appointmentsRequestId.current
    if (append) appendRequestInProgress.current = true

    try {
      setLoading(true)
      setError('')
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const endpoint = nextTab === 'upcoming'
        ? `/agendamentos/?data_inicio=${formatLocalDate(today)}`
        : `/agendamentos/?data_fim=${formatLocalDate(yesterday)}&ordering=-inicio&page=${page}`
      const response = await apiRequest(endpoint)
      if (requestId !== appointmentsRequestId.current) return
      const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : null
      if (!list || !list.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
        throw new Error('A API retornou uma lista de sessões inválida.')
      }
      setAppointments((current) => {
        if (!append) return list
        const seenIds = new Set(current.map((item) => item.id))
        return [...current, ...list.filter((item) => {
          if (seenIds.has(item.id)) return false
          seenIds.add(item.id)
          return true
        })]
      })
      setHistoryHasMore(Boolean(response?.next))
      setHistoryPage(page)
    } catch (err) {
      if (requestId === appointmentsRequestId.current) setError(err.message)
    } finally {
      if (append) appendRequestInProgress.current = false
      if (requestId === appointmentsRequestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    setAppointments([])
    loadAppointments(tab)
  }, [tab])

  useEffect(() => {
    Promise.all([fetchAllPages('/servicos/'), fetchAllPages('/recursos/')])
      .then(([serviceList, resourceList]) => {
        setServiceOptions(serviceList)
        setResourceOptions(resourceList)
      })
      .catch(() => setLookupError('NÃ£o foi possÃ­vel carregar os nomes dos serviÃ§os e profissionais.'))
  }, [])

  const visibleAppointments = tab === 'upcoming'
    ? appointments.filter((item) => !['cancelado', 'concluido'].includes(item.status))
    : appointments

  return (
    <section className="page-block">
      <CabecalhoPagina
        title="Minhas sessões"
        subtitle="Acompanhe seus atendimentos e próximos passos."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />

      <div className="meta-actions">
        <button type="button" className={tab === 'upcoming' ? 'button-primary' : 'button-secondary'} onClick={() => setTab('upcoming')}>Próximos</button>
        <button type="button" className={tab === 'history' ? 'button-primary' : 'button-secondary'} onClick={() => setTab('history')}>Histórico</button>
      </div>
      {loading ? <Carregando message="Carregando sessões" /> : null}
      {error ? <><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={() => loadAppointments(tab, historyPage)}>Tentar de novo</button></> : null}

      <div className="card section-card">
        {lookupError ? <Erro type="info" message={lookupError} /> : null}
        {!loading && !error && visibleAppointments.length > 0 ? (
          <ListaSessoes>
            {visibleAppointments.map((item) => {
              const serviceName = resolveRelatedName(item.servico, serviceOptions, item.servico_nome || item.nome_servico)
              const resourceName = resolveRelatedName(item.recurso, resourceOptions, item.recurso_nome || item.psicologo_nome)
              return <SessaoItem key={item.id} to={`/sessao/${item.id}`} title={serviceName || resourceName || 'Sessão'} subtitle={`${resourceName ? `${resourceName} • ` : ''}${formatDate(item.inicio)}`} status={item.status} />
            })}
            {tab === 'history' && historyHasMore ? <button type="button" className="button-secondary" disabled={loading} onClick={() => loadAppointments('history', historyPage + 1, true)}>{loading ? 'Carregando...' : 'Carregar mais'}</button> : null}
          </ListaSessoes>
        ) : !loading && !error ? (
          <EstadoVazio
            title={tab === 'upcoming' ? 'Nenhuma sessão próxima' : 'Nenhuma sessão no histórico'}
            description="Não há sessões para exibir."
            action={hasPermission(profile?.permissoes, 'api.add_agendamento') ? <Link to="/agendar" className="button-primary">Agendar</Link> : null}
          />
        ) : null}
      </div>
    </section>
  )
}

export default MinhasSessoes
