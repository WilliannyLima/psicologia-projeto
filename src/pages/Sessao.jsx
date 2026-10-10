import { useAuth } from '../AuthContext.js'
import { resolveRelatedName } from '../utils/appointments.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../api/client.js'
import { formatDate, formatCurrency, formatStatus } from '../utils/formatters.js'
import { Erro } from '../components/Erro.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { Carregando } from '../components/Carregando.jsx'
import { BotaoVoltar } from '../components/BotaoVoltar.jsx'
import { ConfirmacaoCancelamento } from '../components/ConfirmacaoCancelamento.jsx'

export function Sessao() {
  const { profile } = useAuth()
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
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
      if (requestId === appointmentRequestId.current) {
        if (err.status === 404) navigate('/minhas-sessoes', { replace: true, state: { errorMessage: 'Não encontrado.' } })
        else setError(err.message)
      }
    } finally {
      if (requestId === appointmentRequestId.current) setLoading(false)
    }
  }

  useEffect(() => { loadAppointment() }, [id])

  const permissions = profile?.permissoes
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

  if (loading) return <section className="page-block"><BotaoVoltar label="Voltar para sessões" to="/minhas-sessoes" /><Carregando message="Carregando sessão" /></section>
  if (error) return <section className="page-block"><BotaoVoltar label="Voltar para sessões" to="/minhas-sessoes" /><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadAppointment}>Tentar de novo</button></section>

  const review = appointment.avaliacao || appointment.avaliacoes?.[0]
  const hasReview = appointment.nota !== undefined && appointment.nota !== null || Boolean(review)
  const serviceName = resolveRelatedName(appointment.servico, serviceOptions, appointment.servico_nome || appointment.nome_servico)
  const resourceName = resolveRelatedName(appointment.recurso, resourceOptions, appointment.recurso_nome || appointment.psicologo_nome)
  const clientName = appointment.cliente?.nome || appointment.cliente_nome || appointment.nome_cliente || profile?.nome || profile?.username
  return (
    <section className="page-block">
      <CabecalhoPagina title="Detalhe da sessão" subtitle="Confira os dados do seu agendamento." backLabel="Voltar para sessões" backTo="/minhas-sessoes" />
      {location.state?.message ? <Erro type="success" message={location.state.message} /> : null}
      {actionMessage ? <Erro type={actionMessage.includes('sucesso') ? 'success' : 'danger'} message={actionMessage} /> : null}
      <div className="card section-card">
        {lookupError ? <Erro type="info" message={lookupError} /> : null}
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
      <ConfirmacaoCancelamento open={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleCancel} loading={cancelLoading} />
    </section>
  )
}

export default Sessao
