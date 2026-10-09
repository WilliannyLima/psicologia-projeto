import { useAgendamento } from './AgendamentoContext.js'
import { useNavigate } from 'react-router-dom'
import { formatLocalDate } from '../../utils/appointments.js'
import { Carregando } from '../../components/Carregando.jsx'

export function EscolherHorario() {
  const { date, min, dateError, slots, slotGroups, slotsLoading, selectDate, selectSlot, selectedResource, selectedService } = useAgendamento()
  const navigate = useNavigate()
  const goBack = () => navigate(selectedResource?.id ? '/agendar' : '/agendar/psicologo')
  const nextDay = () => {
    const next = new Date(`${date}T12:00:00`)
    next.setDate(next.getDate() + 1)
    selectDate(formatLocalDate(next))
  }
  return <div className="card section-card"><button type="button" className="back-button" onClick={goBack}>← Voltar</button><h3>Escolha a data e o horário</h3><p className="muted">{selectedService?.nome}{selectedResource?.nome ? ` • ${selectedResource.nome}` : ' • Qualquer profissional'}</p><label>Data<input type="date" min={min} value={date} onChange={(event) => selectDate(event.target.value)} /></label>{dateError ? <p className="field-error" role="alert">{dateError}</p> : null}{date && slotsLoading ? <Carregando message="Carregando horários disponíveis" /> : null}{date && !slotsLoading && slots.length === 0 ? <><p className="muted">Sem horários livres neste dia. Tente outro dia.</p><button type="button" className="button-secondary" onClick={nextDay}>Próximo dia</button></> : null}{slots.length > 0 ? <div className="slot-resource-groups">{slotGroups.map((group) => <section className="slot-resource-group" key={group.id}><h4>{group.nome}</h4><div className="slot-grid">{group.horarios.map((slot) => <button type="button" key={`${group.id}-${slot.inicio}`} className="slot-item" onClick={() => selectSlot(slot)}><strong>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(slot.inicio))}</strong></button>)}</div></section>)}</div> : null}</div>
}

export default EscolherHorario
