import { useAuth } from '../../AuthContext.js'
import { resolveRelatedName } from '../../utils/appointments.js'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../../api/client.js'
import { formatDate, formatCurrency, formatStatus } from '../../utils/formatters.js'
import { Erro } from '../../components/Erro.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'
import { BotaoVoltar } from '../../components/BotaoVoltar.jsx'
import { ConfirmacaoCancelamento } from '../../components/ConfirmacaoCancelamento.jsx'

export function SessaoAdmin() {
  const { profile } = useAuth()
  const permissions = profile?.permissoes
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [services, setServices] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionId, setActionId] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const cancelRequestInProgress = useRef(false)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [appointment, serviceList, resourceList] = await Promise.all([
        apiRequest(`/agendamentos/${id}/`),
        fetchAllPages('/servicos/'),
        fetchAllPages('/recursos/'),
      ])
      setItem(appointment)
      setServices(serviceList)
      setResources(resourceList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const action = async (endpoint) => {
    try {
      setActionId(endpoint)
      setError('')
      await apiRequest(`/agendamentos/${id}/${endpoint}/`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId('')
    }
  }

  const handleCancel = async () => {
    if (cancelRequestInProgress.current) return
    cancelRequestInProgress.current = true
    try {
      setActionId('cancelar')
      setShowCancelModal(false)
      setActionMessage('')
      await apiRequest(`/agendamentos/${id}/cancelar/`, { method: 'POST' })
      setActionMessage('Sessão cancelada com sucesso.')
      await load()
    } catch (err) {
      setActionMessage(err.message)
    } finally {
      cancelRequestInProgress.current = false
      setActionId('')
    }
  }

  if (loading) return <section className="page-block"><BotaoVoltar label="Voltar para agenda" to="/admin/agenda" /><Carregando message="Carregando sessão" /></section>
  if (error) return <section className="page-block"><BotaoVoltar label="Voltar para agenda" to="/admin/agenda" />{actionMessage ? <Erro type={actionMessage.includes('sucesso') ? 'success' : 'danger'} message={actionMessage} /> : null}<Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></section>

  const serviceName = resolveRelatedName(item.servico, services, item.servico_nome || item.nome_servico)
  const resourceName = resolveRelatedName(item.recurso, resources, item.recurso_nome || item.psicologo_nome)

  return (
    <section className="page-block">
      <CabecalhoPagina title={serviceName || resourceName || 'Detalhe da sessão'} subtitle="Gerencie o agendamento conforme suas permissões." backLabel="Voltar para agenda" backTo="/admin/agenda" />
      {actionMessage ? <Erro type={actionMessage.includes('sucesso') ? 'success' : 'danger'} message={actionMessage} /> : null}
      <div className="card section-card">
        <p><strong>Paciente:</strong> {item.cliente?.nome || item.cliente_nome || item.paciente?.nome || 'Não informado'}</p>
        <p><strong>Serviço:</strong> {serviceName || 'Não informado'}</p>
        <p><strong>Psicólogo:</strong> {resourceName || 'Não informado'}</p>
        <p><strong>Data:</strong> {formatDate(item.inicio)}</p>
        {(item.duracao_min ?? item.duracao) !== undefined ? <p><strong>Duração:</strong> {item.duracao_min ?? item.duracao} min</p> : null}
        {item.preco !== undefined ? <p><strong>Preço:</strong> {formatCurrency(item.preco)}</p> : null}
        <p><strong>Observações:</strong> {item.observacoes || 'Nenhuma'}</p>
        {item.nota !== undefined && item.nota !== null ? <p><strong>Avaliação:</strong> {item.nota}/5</p> : null}
        {item.comentario ? <p><strong>Comentário:</strong> {item.comentario}</p> : null}
        <p><strong>Status:</strong> {formatStatus(item.status)}</p>
        <div className="meta-actions">
          {item.status === 'solicitado' && hasPermission(permissions, 'api.confirmar_agendamento') ? <button type="button" className="button-primary" disabled={actionId === 'confirmar'} onClick={() => action('confirmar')}>{actionId === 'confirmar' ? 'Confirmando...' : 'Confirmar'}</button> : null}
          {item.status === 'confirmado' && hasPermission(permissions, 'api.concluir_agendamento') ? <button type="button" className="button-primary" disabled={actionId === 'concluir'} onClick={() => action('concluir')}>{actionId === 'concluir' ? 'Concluindo...' : 'Concluir'}</button> : null}
          {['solicitado', 'confirmado'].includes(item.status) && hasPermission(permissions, 'api.cancelar_agendamento') ? <button type="button" className="button-secondary" disabled={actionId === 'cancelar'} onClick={() => setShowCancelModal(true)}>{actionId === 'cancelar' ? 'Cancelando...' : 'Cancelar'}</button> : null}
        </div>
      </div>
      <ConfirmacaoCancelamento open={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleCancel} loading={actionId === 'cancelar'} />
    </section>
  )
}

export default SessaoAdmin
