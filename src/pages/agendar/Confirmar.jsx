import { useAgendamento } from './AgendamentoContext.js'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import { ErrosCampos } from '../../components/ErrosCampos.jsx'

export function Confirmar() {
  const { selectedService, selectedResource, selectedSlot, date, observacoes, setObservacoes, fieldErrors, loading, confirmAppointment } = useAgendamento()
  const navigate = useNavigate()
  const resourceName = selectedResource?.nome || selectedSlot?.recurso?.nome || 'Qualquer profissional'
  return <div className="card section-card"><button type="button" className="back-button" onClick={() => navigate('/agendar/horario')}>← Voltar para horários</button><h3>Confirme seu agendamento</h3><p><strong>Profissional:</strong> {resourceName}</p><p><strong>Serviço:</strong> {selectedService?.nome}</p><p><strong>Data:</strong> {date ? formatDate(`${date}T00:00:00`) : 'Data não informada'}</p><p><strong>Horário:</strong> {selectedSlot?.inicio ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSlot.inicio)) : 'Horário não informado'}</p>{selectedService?.duracao_min !== undefined ? <p><strong>Duração:</strong> {selectedService.duracao_min} min</p> : null}{selectedService?.preco !== undefined ? <p><strong>Preço:</strong> {formatCurrency(selectedService.preco)}</p> : null}<label>Observações (recados sobre a agenda)<textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} /></label><p className="muted">Use este campo apenas para recados de agenda. Não informe dados clínicos.</p><ErrosCampos errors={fieldErrors} /><button type="button" className="button-primary" onClick={confirmAppointment} disabled={loading}>{loading ? 'Enviando...' : 'Confirmar agendamento'}</button></div>
}

export default Confirmar
