import { useAuth } from '../../AuthContext.js'
import { resolveRelatedName } from '../../utils/appointments.js'
import { useEffect, useRef, useState } from 'react'
import { hasPermission, fetchAllPages, apiRequest } from '../../api/client.js'
import { formatDate } from '../../utils/formatters.js'
import { Erro } from '../../components/Erro.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'
import { EstadoVazio } from '../../components/EstadoVazio.jsx'
import { ConfirmacaoCancelamento } from '../../components/ConfirmacaoCancelamento.jsx'

export function AConfirmar() {
  const { profile } = useAuth()
  const permissions = profile?.permissoes
  const [requests, setRequests] = useState([])
  const [services, setServices] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionId, setActionId] = useState('')
  const [pendingCancellation, setPendingCancellation] = useState(null)
  const cancelRequestInProgress = useRef(false)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [items, serviceList, resourceList] = await Promise.all([
        fetchAllPages('/agendamentos/?status=solicitado'),
        fetchAllPages('/servicos/'),
        fetchAllPages('/recursos/'),
      ])
      setRequests(items.sort((first, second) => new Date(first.inicio) - new Date(second.inicio)))
      setServices(serviceList)
      setResources(resourceList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const action = async (id, endpoint) => {
    try {
      setActionId(id)
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
    if (!pendingCancellation || cancelRequestInProgress.current) return
    cancelRequestInProgress.current = true
    const appointmentId = pendingCancellation.id
    try {
      setActionId(appointmentId)
      setPendingCancellation(null)
      setActionMessage('')
      await apiRequest(`/agendamentos/${appointmentId}/cancelar/`, { method: 'POST' })
      setActionMessage('Sessão cancelada com sucesso.')
      await load()
    } catch (err) {
      setActionMessage(err.message)
    } finally {
      cancelRequestInProgress.current = false
      setActionId('')
    }
  }

  const closeCancelModal = () => setPendingCancellation(null)

  return (
    <section className="page-block">
      <CabecalhoPagina title="Pedidos para confirmar" subtitle="Revise e responda às solicitações." backLabel="Voltar para administração" backTo="/admin" />
      {actionMessage ? <Erro type={actionMessage.includes('sucesso') ? 'success' : 'danger'} message={actionMessage} /> : null}
      {loading ? <Carregando message="Carregando solicitações" /> : null}
      {error ? <><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}
      <div className="card section-card">
        {!loading && !error && requests.length === 0 ? <EstadoVazio title="Nenhum pedido para confirmar" description="A fila está vazia." /> : (
          <div className="list-stack">
            {requests.map((item) => {
              const serviceName = resolveRelatedName(item.servico, services, item.servico_nome || item.nome_servico)
              const resourceName = resolveRelatedName(item.recurso, resources, item.recurso_nome || item.psicologo_nome)
              return (
                <div className="list-item" key={item.id}>
                  <div>
                    <strong>{item.cliente?.nome || item.cliente_nome || item.paciente?.nome || 'Paciente'}</strong>
                    <p>{serviceName || 'Sessão'} • {resourceName || 'Psicólogo'} • {formatDate(item.inicio)}</p>
                    <p>{item.observacoes || 'Sem observações.'}</p>
                  </div>
                  <div className="meta-actions">
                    {hasPermission(permissions, 'api.confirmar_agendamento') ? <button type="button" className="button-primary small-button" disabled={actionId === item.id} onClick={() => action(item.id, 'confirmar')}>Confirmar</button> : null}
                    {hasPermission(permissions, 'api.cancelar_agendamento') ? <button type="button" className="button-secondary small-button" disabled={actionId === item.id} onClick={() => { setActionMessage(''); setPendingCancellation(item) }}>Cancelar</button> : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <ConfirmacaoCancelamento open={Boolean(pendingCancellation)} onClose={closeCancelModal} onConfirm={handleCancel} loading={Boolean(pendingCancellation && actionId === pendingCancellation.id)} />
    </section>
  )
}

export default AConfirmar
