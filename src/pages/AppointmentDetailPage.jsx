import { resolveRelatedName } from '../utils/appointments.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { STORAGE_KEYS, readStoredJSON, hasPermission, fetchAllPages, apiRequest } from '../services/api.js'
import { formatDate, formatCurrency, formatStatus } from '../utils/formatters.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { BackButton } from '../components/layout/BackButton.jsx'

export function AppointmentDetailPage({ profile }) {
  const { id } = useParams()
  const location = useLocation()
  const [appointment, setAppointment] = useState(null)
  const [serviceOptions, setServiceOptions] = useState([])
  const [resourceOptions, setResourceOptions] = useState([])
  const [lookupError, setLookupError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const appointmentRequestId = useRef(0)
  const cancelRequestInProgress = useRef(false)

  const loadAppointment = async () => {
    const requestId = ++appointmentRequestId.current
    try {
      setLoading(true)
      setError('')
      const appointmentResponse = await apiRequest(`/agendamentos/${id}/`)
      if (requestId !== appointmentRequestId.current) return
      if (!appointmentResponse || typeof appointmentResponse !== 'object' || Array.isArray(appointmentResponse)) {
        throw new Error('A API retornou dados de sessão inválidos.')
      }
      setAppointment(appointmentResponse)
      const [serviceResult, resourceResult] = await Promise.allSettled([
        fetchAllPages('/servicos/'),
        fetchAllPages('/recursos/'),
      ])
      if (requestId !== appointmentRequestId.current) return
      setServiceOptions(serviceResult.status === 'fulfilled' ? serviceResult.value : [])
      setResourceOptions(resourceResult.status === 'fulfilled' ? resourceResult.value : [])
      if (serviceResult.status === 'rejected' || resourceResult.status === 'rejected') {
        setLookupError('NÃ£o foi possÃ­vel carregar os nomes dos serviÃ§os e profissionais.')
      } else {
        setLookupError('')
      }
    } catch (err) {
      if (requestId === appointmentRequestId.current) setError(err.message)
    } finally {
      if (requestId === appointmentRequestId.current) setLoading(false)
    }
  }

  useEffect(() => { loadAppointment() }, [id])

  const permissions = readStoredJSON(STORAGE_KEYS.profile)?.permissoes
  const canReview = hasPermission(permissions, 'api.avaliar_agendamento')
  const canCancel = hasPermission(permissions, 'api.cancelar_agendamento') && ['solicitado', 'confirmado'].includes(appointment?.status)
  const handleCancel = async () => {
    if (cancelRequestInProgress.current) return
    cancelRequestInProgress.current = true
    try {
      setCancelLoading(true)
      setShowCancelModal(false)
      setActionMessage('')
      await apiRequest(`/agendamentos/${id}/cancelar/`, { method: 'POST' })
      setActionMessage('Sessão cancelada com sucesso.')
      await loadAppointment()
    } catch (err) {
      setActionMessage(err.message)
    } finally {
      cancelRequestInProgress.current = false
      setCancelLoading(false)
    }
  }

  if (loading) return <section className="page-block"><BackButton label="Voltar para sessões" to="/minhas-sessoes" /><LoadingState message="Carregando sessão" /></section>
  if (error) return <section className="page-block"><BackButton label="Voltar para sessões" to="/minhas-sessoes" /><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadAppointment}>Tentar de novo</button></section>

  const review = appointment.avaliacao || appointment.avaliacoes?.[0]
  const hasReview = appointment.nota !== undefined && appointment.nota !== null || Boolean(review)
  const serviceName = resolveRelatedName(appointment.servico, serviceOptions, appointment.servico_nome || appointment.nome_servico)
  const resourceName = resolveRelatedName(appointment.recurso, resourceOptions, appointment.recurso_nome || appointment.psicologo_nome)
  const clientName = appointment.cliente?.nome || appointment.cliente_nome || appointment.nome_cliente || profile?.nome || profile?.username
  return (
    <section className="page-block">
      <PageHeader title="Detalhe da sessão" subtitle="Confira os dados do seu agendamento." backLabel="Voltar para sessões" backTo="/minhas-sessoes" />
      {location.state?.message ? <Alert type="success" message={location.state.message} /> : null}
      {actionMessage ? <Alert type={actionMessage.includes('sucesso') ? 'success' : 'danger'} message={actionMessage} /> : null}
      <div className="card section-card">
        {lookupError ? <Alert type="info" message={lookupError} /> : null}
        <h3>{serviceName || resourceName || 'Sessão'}</h3>
        <p><strong>Psicólogo:</strong> {resourceName || 'Não informado'}</p>
        <p><strong>Cliente:</strong> {clientName || 'Não informado'}</p>
        <p><strong>Data e horário:</strong> {formatDate(appointment.inicio)}</p>
        {(appointment.duracao_min ?? appointment.duracao) !== undefined ? <p><strong>Duração:</strong> {appointment.duracao_min ?? appointment.duracao} min</p> : null}
        {appointment.preco !== undefined ? <p><strong>Preço:</strong> {formatCurrency(appointment.preco)}</p> : null}
        {appointment.observacoes ? <p><strong>Observações:</strong> {appointment.observacoes}</p> : null}
        <p><strong>Status:</strong> {formatStatus(appointment.status)}</p>
        <div className="meta-actions">
          {canCancel ? <button type="button" className="button-secondary" onClick={() => setShowCancelModal(true)} disabled={cancelLoading}>{cancelLoading ? 'Cancelando...' : 'Cancelar'}</button> : null}
          {appointment.status === 'concluido' && !hasReview && canReview ? <Link to={`/sessao/${id}/avaliar`} className="button-primary">Avaliar</Link> : null}
        </div>
        {hasReview ? <div className="session-highlight"><strong>Avaliação: {appointment.nota ?? review?.nota}/5</strong><span>{appointment.comentario || review?.comentario || 'Sem comentário'}</span></div> : null}
      </div>
      {showCancelModal ? (
        <div className="confirmation-backdrop" onClick={() => setShowCancelModal(false)}>
          <section className="confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="cancel-session-title" aria-describedby="cancel-session-message" onClick={(event) => event.stopPropagation()}>
            <div className="confirmation-icon" aria-hidden="true">!</div>
            <h2 id="cancel-session-title">Cancelar sessão?</h2>
            <p id="cancel-session-message">Tem certeza de que deseja cancelar esta sessão?</p>
            <div className="confirmation-actions">
              <button type="button" className="button-ghost" onClick={() => setShowCancelModal(false)}>Voltar</button>
              <button type="button" className="button-danger" onClick={handleCancel} disabled={cancelLoading}>{cancelLoading ? 'Cancelando...' : 'Cancelar sessão'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default AppointmentDetailPage
