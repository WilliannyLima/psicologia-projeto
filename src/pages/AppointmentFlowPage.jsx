import { buildAppointmentPayload, formatLocalDate, groupSlotsByResource, isSelectableDate } from '../utils/appointments.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchAllPages, apiRequest } from '../services/api.js'
import { formatDate, formatCurrency, formatStatus } from '../utils/formatters.js'
import { Alert } from '../components/ui/Alert.jsx'
import { FieldErrors } from '../components/forms/FieldErrors.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

export function AppointmentFlowPage() {
  const location = useLocation()
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [resources, setResources] = useState([])
  const [selectedResource, setSelectedResource] = useState(location.state?.resource || null)
  const [date, setDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [observacoes, setObservacoes] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submittedAppointment, setSubmittedAppointment] = useState(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const slotsRequestId = useRef(0)
  const submittingRef = useRef(false)
  const dateInputRef = useRef(null)
  const preselectedResource = location.state?.resource || null
  const [min] = useState(() => formatLocalDate(new Date()))

  const availableServices = selectedResource?.id
    ? services.filter((service) => {
        if (Array.isArray(selectedResource.servicos)) {
          return selectedResource.servicos.some((relatedService) => Number(relatedService?.id ?? relatedService) === Number(service.id))
        }
        if (Array.isArray(service.recursos)) {
          return service.recursos.some((resourceId) => Number(resourceId) === Number(selectedResource.id))
        }
        return true
      })
    : services

  const normalizeAvailableSlots = (response) => {
    const groups = Array.isArray(response)
      ? response
      : Array.isArray(response?.results)
        ? response.results
        : []

    return groups.flatMap((group) => {
      if (!Array.isArray(group?.horarios)) return []

      return group.horarios
        .filter((inicio) => typeof inicio === 'string' && !Number.isNaN(Date.parse(inicio)))
        .map((inicio) => ({
          inicio,
          ...(group.recurso ? { recurso: group.recurso } : {}),
        }))
    })
  }

  const loadServices = async () => {
    try {
      setLoading(true)
      setError('')
      setServices(await fetchAllPages('/servicos/'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectResource = async (resource) => {
    slotsRequestId.current += 1
    setLoading(false)
    setSelectedResource(resource)
    setDate('')
    setDateError('')
    if (dateInputRef.current) dateInputRef.current.value = ''
    setSlots([])
    setSelectedSlot(null)
    setError('')
    setStep(3)
  }

  const loadResources = async () => {
    if (!selectedService?.id) return
    try {
      setLoading(true)
      setError('')
      setResources(await fetchAllPages(`/recursos/?servicos=${selectedService.id}`))
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (preselectedResource) setSelectedResource(preselectedResource)
    loadServices()
  }, [])

  const handleSelectService = async (service) => {
    slotsRequestId.current += 1
    setLoading(false)
    setError('')
    setSelectedService(service)
    setDate('')
    setDateError('')
    setResources([])
    setLoaded(false)
    if (dateInputRef.current) dateInputRef.current.value = ''
    setSlots([])
    setSelectedSlot(null)
    if (selectedResource?.id) {
      setStep(3)
      return
    }
    setStep(2)
    try {
      setLoading(true)
      setResources(await fetchAllPages(`/recursos/?servicos=${service.id}`))
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSlotsFor = async (service, resource, selectedDate) => {
    if (!service || !selectedDate) return
    const requestId = ++slotsRequestId.current

    try {
      setLoading(true)
      setError('')
      const result = await apiRequest(
        `/horarios-livres/?servico=${service.id}&data=${selectedDate}${resource?.id ? `&recurso=${resource.id}` : ''}`,
      )
      if (requestId !== slotsRequestId.current) return
      const availableSlots = normalizeAvailableSlots(result)
      setSlots(availableSlots)
      setSelectedSlot(null)
    } catch (err) {
      if (requestId !== slotsRequestId.current) return
      setError(err.message)
    } finally {
      if (requestId === slotsRequestId.current) setLoading(false)
    }
  }

  const loadSlots = (selectedDate = date) => loadSlotsFor(selectedService, selectedResource, selectedDate)

  const handleSelectDate = (value) => {
    if (!value) {
      slotsRequestId.current += 1
      setDate('')
      setDateError('')
      setSlots([])
      setSelectedSlot(null)
      setError('')
      setLoading(false)
      return
    }

    if (value.length !== 10 || Number(value.slice(0, 4)) < 2000) {
      slotsRequestId.current += 1
      setDate('')
      if (dateInputRef.current) dateInputRef.current.value = ''
      setDateError('Selecione uma data válida.')
      setSlots([])
      setSelectedSlot(null)
      setLoading(false)
      return
    }
    if (!isSelectableDate(value, min)) {
      setDateError('Não é possível selecionar uma data que já passou. Escolha uma data futura.')
      slotsRequestId.current += 1
      setDate('')
      if (dateInputRef.current) dateInputRef.current.value = ''
      setSlots([])
      setSelectedSlot(null)
      setError('')
      setLoading(false)
      return
    }
    setDateError('')
    setDate(value)
    if (dateInputRef.current) dateInputRef.current.value = value
    setSlots([])
    setSelectedSlot(null)
    slotsRequestId.current += 1
    if (value) {
      loadSlotsFor(selectedService, selectedResource, value)
    }
  }

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot)
    setStep(4)
  }

  const handleConfirm = async () => {
    if (submittingRef.current) return
    if (!selectedService || !selectedSlot?.inicio) {
      setError('Selecione um serviço e um horário disponível.')
      return
    }

    const recursoId = selectedResource?.id || selectedSlot?.recurso?.id
    if (!recursoId) {
      setError('Selecione um horário com psicólogo disponível.')
      return
    }

    try {
      submittingRef.current = true
      setLoading(true)
      setError('')
      setFieldErrors({})
      const payload = buildAppointmentPayload({ selectedService, selectedResource, selectedSlot, observacoes })

      const response = await apiRequest('/agendamentos/', {
        method: 'POST',
        body: payload,
      })

      setSubmittedAppointment(response)
      setStep(6)
    } catch (err) {
      if (err.fields?.inicio) {
        setStep(3)
        await loadSlots()
        setError(err.fields.inicio)
      } else {
        setError(err.message)
      }
      setFieldErrors(err.fields || {})
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  const slotGroups = groupSlotsByResource(slots, selectedResource)

  if (step === 6) {
    const appointment = submittedAppointment || {}
    return (
      <section className="page-block change-password-page">
        <PageHeader title="Agendamento enviado" subtitle="Sua solicitação foi registrada com sucesso." />
        <div className="card section-card">
          <h3>Agendamento solicitado</h3>
          <p>O agendamento aguarda a confirmação do administrador.</p>
          <div className="session-highlight">
            <div>
              <strong>{selectedService?.nome || appointment.servico?.nome || 'Serviço selecionado'}</strong>
              <p>{selectedResource?.nome || appointment.recurso?.nome || 'Qualquer um'} • {formatDate(appointment.inicio || selectedSlot?.inicio)}</p>
            </div>
            <span className="badge">{appointment.status === 'solicitado' ? 'Solicitada' : formatStatus(appointment.status)}</span>
          </div>
          <p className="muted">
            {selectedService?.duracao_min ? `${selectedService.duracao_min} min` : ''}
            {selectedService?.preco !== undefined ? ` • ${formatCurrency(selectedService.preco)}` : ''}
          </p>
          <div className="meta-actions">
            {appointment.id ? (
              <Link to={`/sessao/${appointment.id}`} className="button-secondary">Ver sessão</Link>
            ) : null}
            <Link to="/dashboard" className="button-primary">Início</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-block">
      <PageHeader
        title="Agendar sessão"
        subtitle="Escolha o serviço, os profissionais e o horário ideal."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />

      {error ? (
        <>
          <Alert type="danger" message={error} />
          <button type="button" className="button-secondary" onClick={step === 1 ? loadServices : step === 2 ? loadResources : loadSlots}>
            Tentar de novo
          </button>
        </>
      ) : null}
      {loading ? <LoadingState message="Carregando informações do agendamento" /> : null}

      {step === 1 && !loading ? (
        <div className="card section-card">
          <h3>Escolha o serviço</h3>
          {availableServices.length === 0 ? <EmptyState title="Nenhum serviço disponível" description="Ainda não há serviços disponíveis para agendamento." /> : (
            <div className="service-grid">
              {availableServices.map((service) => <button type="button" key={service.id} className="service-card" onClick={() => handleSelectService(service)}>{service.imagem || service.imagem_url ? <img src={service.imagem || service.imagem_url} alt="" /> : null}<strong>{service.nome}</strong>{service.descricao ? <span>{service.descricao}</span> : null}{service.duracao_min !== undefined ? <em>{service.duracao_min} min</em> : null}{service.preco !== undefined ? <b>{formatCurrency(service.preco)}</b> : null}</button>)}
            </div>
          )}
        </div>
      ) : null}

      {step === 2 && !loading ? (
        <div className="card section-card">
          <button type="button" className="back-button" onClick={() => { setSelectedService(null); setStep(1) }}>← Voltar para serviços</button>
          <h3>Escolha o psicólogo</h3>
          {!loaded || resources.length === 0 ? <EmptyState title="Nenhum psicólogo realiza este serviço" description="Ainda não há profissionais disponíveis para este serviço." /> : (
            <div className="staff-grid">
              <button type="button" className="staff-card" onClick={() => handleSelectResource(null)}><div className="staff-card-content"><h3>Qualquer profissional</h3><p>Escolha entre os profissionais disponíveis para o serviço.</p></div></button>
              {resources.map((resource) => <article className="card staff-card" key={resource.id}><button type="button" className="staff-card-select" onClick={() => handleSelectResource(resource)}><div className="staff-card-content">{resource.foto || resource.foto_url ? <img src={resource.foto || resource.foto_url} alt="" /> : null}<h3>{resource.nome}</h3>{resource.bio ? <p>{resource.bio}</p> : null}</div></button><Link to={`/psicologo/${resource.id}`} className="button-secondary small-button">Ver avaliações</Link></article>)}
            </div>
          )}
        </div>
      ) : null}
      {step === 3 ? (
        <div className="card section-card">
          <button type="button" className="back-button" onClick={() => setStep(selectedResource ? 1 : 2)}>← Voltar</button>
          <h3>Escolha a data e o horário</h3>
          <label>Data<input ref={dateInputRef} type="date" min={min} defaultValue={date} onChange={(event) => handleSelectDate(event.target.value)} /></label>
          {dateError ? <p className="field-error" role="alert">{dateError}</p> : null}
          {date && loading ? <LoadingState message="Carregando horários disponíveis" /> : null}
          {date && !loading && !error && slots.length === 0 ? <><p className="muted">Sem horários livres neste dia. Tente outro dia.</p><button type="button" className="button-secondary" onClick={() => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 1); handleSelectDate(formatLocalDate(next)) }}>Próximo dia</button></> : null}
          {slots.length > 0 ? <div className="slot-resource-groups">{slotGroups.map((group) => <section className="slot-resource-group" key={group.id}><h4>{group.nome}</h4><div className="slot-grid">{group.horarios.map((slot) => <button type="button" key={group.id + '-' + slot.inicio} className="slot-item" onClick={() => handleSelectSlot(slot)}><strong>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(slot.inicio))}</strong></button>)}</div></section>)}</div> : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="card section-card">
          <button type="button" className="back-button" onClick={() => setStep(3)}>← Voltar para horários</button>
          <h3>Confirme seu agendamento</h3>
          <p><strong>Profissional:</strong> {selectedResource?.nome || selectedSlot?.recurso?.nome || 'Qualquer profissional'}</p>
          <p><strong>Serviço:</strong> {selectedService?.nome}</p>
          <p><strong>Data:</strong> {date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) : 'Data não informada'}</p>
          <p><strong>Horário:</strong> {selectedSlot?.horario || (selectedSlot?.inicio ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSlot.inicio)) : 'Horário não informado')}</p>
          {selectedService?.duracao_min !== undefined ? <p><strong>Duração:</strong> {selectedService.duracao_min} min</p> : null}
          {selectedService?.preco !== undefined ? <p><strong>Preço:</strong> {formatCurrency(selectedService.preco)}</p> : null}
          <label>Observações (recados sobre a agenda)<textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} /></label>
          <p className="muted">Use este campo apenas para recados de agenda. Não informe dados clínicos.</p>
          <FieldErrors errors={fieldErrors} />
          {error ? <Alert type="danger" message={error} /> : null}
          <button type="button" className="button-primary" onClick={handleConfirm} disabled={loading}>Confirmar agendamento</button>
        </div>
      ) : null}    </section>
  )
}

export default AppointmentFlowPage
