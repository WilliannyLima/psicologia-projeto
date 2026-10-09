import { Link } from 'react-router-dom'
import { useAgendamento } from './AgendamentoContext.js'
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js'

export function Enviado() {
  const { selectedService, selectedResource, selectedSlot, submittedAppointment } = useAgendamento()
  const appointment = submittedAppointment || {}
  return <div className="card section-card"><h3>Agendamento solicitado</h3><p>Sua solicitação foi registrada. O administrador vai confirmar o atendimento.</p><div className="session-highlight"><div><strong>{selectedService?.nome || appointment.servico?.nome || 'Serviço selecionado'}</strong><p>{selectedResource?.nome || appointment.recurso?.nome || selectedSlot?.recurso?.nome || 'Qualquer profissional'} • {formatDate(appointment.inicio || selectedSlot?.inicio)}</p></div><span className="badge">{appointment.status === 'solicitado' ? 'Solicitada' : formatStatus(appointment.status)}</span></div><p className="muted">{selectedService?.duracao_min ? `${selectedService.duracao_min} min` : ''}{selectedService?.preco !== undefined ? ` • ${formatCurrency(selectedService.preco)}` : ''}</p><div className="meta-actions">{appointment.id ? <Link to={`/sessao/${appointment.id}`} className="button-secondary">Ver sessão</Link> : null}<Link to="/dashboard" className="button-primary">Início</Link></div></div>
}

export default Enviado
