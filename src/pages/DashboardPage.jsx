import { formatLocalDate, resolveRelatedName } from '../utils/appointments.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../services/api.js'
import { formatDate, formatStatus } from '../utils/formatters.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { StatCard } from '../components/ui/StatCard.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

export function DashboardPage({ profile }) {
  const [organization, setOrganization] = useState(null)
  const [nextSession, setNextSession] = useState(null)
  const [serviceOptions, setServiceOptions] = useState([])
  const [resourceOptions, setResourceOptions] = useState([])
  const [lookupError, setLookupError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dashboardRequestIdRef = useRef(0)
  const dashboardRequestInProgressRef = useRef(false)
  const lookupRequestIdRef = useRef(0)

  const loadDashboard = async () => {
    if (dashboardRequestInProgressRef.current) return
    dashboardRequestInProgressRef.current = true
    const requestId = ++dashboardRequestIdRef.current

    try {
      setLoading(true)
      setError('')
      setServiceOptions([])
      setResourceOptions([])
      setLookupError('')
      const today = formatLocalDate(new Date())
      const [org, agenda] = await Promise.all([
        apiRequest('/organizacao/'),
        fetchAllPages(`/agendamentos/?data_inicio=${today}`, { strict: true }),
      ])
      if (requestId !== dashboardRequestIdRef.current) return
      if (!org || typeof org !== 'object' || Array.isArray(org)) {
        throw new Error('A API retornou dados da organização inválidos.')
      }
      if (!agenda.every((appointment) => (
        appointment &&
        typeof appointment === 'object' &&
        !Array.isArray(appointment) &&
        appointment.id !== undefined &&
        appointment.id !== null &&
        typeof appointment.inicio === 'string' &&
        !Number.isNaN(Date.parse(appointment.inicio))
      ))) {
        throw new Error('A API retornou dados de sessões inválidos.')
      }

      const now = new Date()
      const upcoming = agenda
        .filter((appointment) => ['solicitado', 'confirmado'].includes(appointment.status))
        .filter((appointment) => new Date(appointment.inicio) >= now)
        .sort((first, second) => new Date(first.inicio) - new Date(second.inicio))[0] || null
      setOrganization(org)
      setNextSession(upcoming)
    } catch (err) {
      if (requestId === dashboardRequestIdRef.current) setError(err.message)
    } finally {
      dashboardRequestInProgressRef.current = false
      if (requestId === dashboardRequestIdRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    const lookupRequestId = ++lookupRequestIdRef.current
    if (!nextSession) return
    const serviceName = resolveRelatedName(
      nextSession.servico,
      [],
      nextSession.servico_nome || nextSession.nome_servico,
    )
    const resourceName = resolveRelatedName(
      nextSession.recurso,
      [],
      nextSession.recurso_nome || nextSession.psicologo_nome,
    )
    if (serviceName && resourceName) return
    Promise.allSettled([
      serviceName ? Promise.resolve([]) : fetchAllPages('/servicos/'),
      resourceName ? Promise.resolve([]) : fetchAllPages('/recursos/'),
    ])
      .then(([serviceResult, resourceResult]) => {
        if (lookupRequestId !== lookupRequestIdRef.current) return
        setServiceOptions(serviceResult.status === 'fulfilled' ? serviceResult.value : [])
        setResourceOptions(resourceResult.status === 'fulfilled' ? resourceResult.value : [])
        if (serviceResult.status === 'rejected' || resourceResult.status === 'rejected') {
          setLookupError('Falha ao carregar nomes de servicos e profissionais.')
        } else {
          setLookupError('')
        }
      })
      .catch(() => setLookupError('NÃ£o foi possÃ­vel carregar os nomes dos serviÃ§os e profissionais.'))
  }, [nextSession])

  const nextServiceName = resolveRelatedName(nextSession?.servico, serviceOptions, nextSession?.servico_nome || nextSession?.nome_servico)
  const nextResourceName = resolveRelatedName(nextSession?.recurso, resourceOptions, nextSession?.recurso_nome || nextSession?.psicologo_nome)

  return (
    <section className="page-block profile-page">
      <PageHeader
        title="Painel do paciente"
        subtitle={profile?.nome ? `Bem-vindo(a), ${profile.nome}.` : 'Acompanhe seus atendimentos.'}
      >
        {hasPermission(profile?.permissoes, 'api.add_agendamento') ? <Link to="/agendar" className="button-primary">Agendar nova sessão</Link> : null}
      </PageHeader>

      {loading ? (
        <LoadingState message="Carregando painel do paciente" />
      ) : error ? (
        <>
          <Alert type="danger" message={error} />
          <button type="button" className="button-secondary" onClick={loadDashboard}>Tentar de novo</button>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard label="Negócio" value={organization?.nome || 'Não informado'} accent="primary" />
            <StatCard label="Próxima sessão" value={nextSession ? formatDate(nextSession.inicio) : 'Sem agendamento'} accent="secondary" />
            <StatCard label="Status" value={nextSession?.status ? formatStatus(nextSession.status) : '—'} accent="tertiary" />
          </div>

          <div className="card section-card">
            {organization?.logo ? <img className="admin-image-preview" src={organization.logo} alt={`Logo de ${organization.nome || 'Psicologia'}`} /> : null}
            <h3>Próximo atendimento</h3>
            {lookupError ? <Alert type="info" message={lookupError} /> : null}
            {nextSession ? (
              <div className="session-highlight">
                <div>
                  <strong>{nextServiceName || nextResourceName || 'Sessão'}</strong>
                  <p>{nextResourceName ? `${nextResourceName} • ` : ''}{formatDate(nextSession.inicio)}</p>
                </div>
                <div className="meta-actions">
                  <span className="badge">{formatStatus(nextSession.status)}</span>
                  <Link to="/minhas-sessoes" className="button-secondary small-button">Ver agendamento</Link>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Você ainda não possui sessões agendadas"
                description="Acesse o agendamento para escolher profissional e horário."
                action={hasPermission(profile?.permissoes, 'api.add_agendamento') ? <Link to="/agendar" className="button-secondary">Agendar</Link> : null}
              />
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default DashboardPage
