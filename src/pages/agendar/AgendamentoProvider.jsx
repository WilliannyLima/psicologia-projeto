import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, fetchAllPages } from '../../api/client.js'
import { buildAppointmentPayload, formatLocalDate, isSelectableDate, groupSlotsByResource } from '../../utils/appointments.js'
import { AgendamentoContext } from './AgendamentoContext.js'

const DRAFT_KEY = 'psicologia_agendamento_rascunho'

function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null') || {} } catch { return {} }
}

function normalizeAvailableSlots(response) {
  const groups = Array.isArray(response) ? response : Array.isArray(response?.results) ? response.results : []
  return groups.flatMap((group) => Array.isArray(group?.horarios)
    ? group.horarios.filter((inicio) => typeof inicio === 'string' && !Number.isNaN(Date.parse(inicio))).map((inicio) => ({ inicio, ...(group.recurso ? { recurso: group.recurso } : {}) }))
    : [])
}

export function AgendamentoProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [saved] = useState(readDraft)
  const resourceFromProfile = location.state?.resource || null
  const [services, setServices] = useState([])
  const [resources, setResources] = useState([])
  const [resourcesLoaded, setResourcesLoaded] = useState(false)
  const [slots, setSlots] = useState([])
  const [selectedService, setSelectedService] = useState(saved.selectedService || null)
  const [selectedResource, setSelectedResource] = useState(resourceFromProfile || saved.selectedResource || null)
  const [professionalChosen, setProfessionalChosen] = useState(Boolean(resourceFromProfile || saved.professionalChosen))
  const [date, setDate] = useState(saved.date || '')
  const [selectedSlot, setSelectedSlot] = useState(saved.selectedSlot || null)
  const [observacoes, setObservacoes] = useState(saved.observacoes || '')
  const [submittedAppointment, setSubmittedAppointment] = useState(saved.submittedAppointment || null)
  const [loading, setLoading] = useState(true)
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(Boolean(saved.date))
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [min] = useState(() => formatLocalDate(new Date()))
  const requestId = useRef(0)
  const submitting = useRef(false)
  const restoredAvailability = useRef(false)

  const availableServices = selectedResource?.id
    ? services.filter((service) => Array.isArray(selectedResource.servicos)
      ? selectedResource.servicos.some((relatedService) => Number(relatedService?.id ?? relatedService) === Number(service.id))
      : Array.isArray(service.recursos)
        ? service.recursos.some((resourceId) => Number(resourceId?.id ?? resourceId) === Number(selectedResource.id))
        : true)
    : services

  const loadServices = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await fetchAllPages('/servicos/')
      setServices(result)
      setServicesLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadResources = useCallback(async () => {
    if (!selectedService?.id) return
    try {
      setLoading(true)
      setError('')
      setResources(await fetchAllPages(`/recursos/?servicos=${selectedService.id}`))
      setResourcesLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedService])

  const loadSlots = useCallback(async (selectedDate = date, { preserveSelection = false } = {}) => {
    if (!selectedService?.id || !selectedDate) return []
    const currentRequest = ++requestId.current
    try {
      setSlotsLoading(true)
      setError('')
      const result = await apiRequest(`/horarios-livres/?servico=${selectedService.id}&data=${selectedDate}${selectedResource?.id ? `&recurso=${selectedResource.id}` : ''}`)
      if (currentRequest !== requestId.current) return []
      const availableSlots = normalizeAvailableSlots(result)
      setSlots(availableSlots)
      if (preserveSelection && selectedSlot?.inicio) {
        const stillAvailable = availableSlots.find((slot) => Date.parse(slot.inicio) === Date.parse(selectedSlot.inicio))
        setSelectedSlot(stillAvailable || null)
      } else {
        setSelectedSlot(null)
      }
      return availableSlots
    } catch (err) {
      if (currentRequest === requestId.current) {
        setSlots([])
        setSelectedSlot(null)
        setError(err.message)
      }
      return []
    } finally {
      if (currentRequest === requestId.current) setSlotsLoading(false)
    }
  }, [date, selectedService, selectedResource, selectedSlot?.inicio])

  useEffect(() => { loadServices() }, [loadServices])

  useEffect(() => {
    if (!servicesLoaded || !saved.date || saved.submittedAppointment || restoredAvailability.current) return
    restoredAvailability.current = true
    loadSlots(saved.date, { preserveSelection: true })
  }, [servicesLoaded, loadSlots, saved.date, saved.submittedAppointment])

  useEffect(() => {
    const snapshot = { selectedService, selectedResource, professionalChosen, date, selectedSlot, observacoes, submittedAppointment }
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot)) } catch { /* Storage may be unavailable. */ }
  }, [selectedService, selectedResource, professionalChosen, date, selectedSlot, observacoes, submittedAppointment])

  useEffect(() => () => { sessionStorage.removeItem(DRAFT_KEY) }, [])

  const selectService = (service) => {
    setError('')
    setFieldErrors({})
    setSelectedService(service)
    setDate('')
    setDateError('')
    setResources([])
    setResourcesLoaded(false)
    setSlots([])
    setSelectedSlot(null)
    setObservacoes('')
    setSubmittedAppointment(null)
    requestId.current += 1
    navigate(selectedResource?.id ? '/agendar/horario' : '/agendar/psicologo')
  }

  const selectResource = (resource) => {
    requestId.current += 1
    setSelectedResource(resource)
    setProfessionalChosen(true)
    setDate('')
    setDateError('')
    setSlots([])
    setSelectedSlot(null)
    setError('')
    navigate('/agendar/horario')
  }

  const selectDate = (value) => {
    if (!value) {
      requestId.current += 1
      setDate('')
      setDateError('')
      setSlots([])
      setSelectedSlot(null)
      setError('')
      setSlotsLoading(false)
      return
    }
    if (value.length !== 10 || Number(value.slice(0, 4)) < 2000) {
      requestId.current += 1
      setDate('')
      setDateError('Selecione uma data válida.')
      setSlots([])
      setSelectedSlot(null)
      setSlotsLoading(false)
      return
    }
    if (!isSelectableDate(value, min)) {
      requestId.current += 1
      setDate('')
      setDateError('Não é possível selecionar uma data que já passou. Escolha uma data futura.')
      setSlots([])
      setSelectedSlot(null)
      setError('')
      setSlotsLoading(false)
      return
    }
    setDateError('')
    setDate(value)
    setSlots([])
    setSelectedSlot(null)
    setError('')
    loadSlots(value)
  }

  const selectSlot = (slot) => {
    setError('')
    setFieldErrors({})
    setSelectedSlot(slot)
    navigate('/agendar/confirmar')
  }

  const confirmAppointment = async () => {
    if (submitting.current) return
    if (!selectedService || !selectedSlot?.inicio) {
      setError('Selecione um serviço e um horário disponível.')
      navigate('/agendar/horario')
      return
    }
    if (!(selectedResource?.id || selectedSlot?.recurso?.id)) {
      setError('Selecione um horário com psicólogo disponível.')
      navigate('/agendar/horario')
      return
    }
    try {
      submitting.current = true
      setLoading(true)
      setError('')
      setFieldErrors({})
      const result = await apiRequest('/agendamentos/', {
        method: 'POST',
        body: buildAppointmentPayload({ selectedService, selectedResource, selectedSlot, observacoes }),
      })
      setSubmittedAppointment(result)
      navigate('/agendar/enviado', { replace: true })
    } catch (err) {
      if (err.fields?.inicio) {
        const slotError = err.fields.inicio
        setFieldErrors(err.fields)
        navigate('/agendar/horario')
        await loadSlots(date)
        setError(slotError)
      } else {
        setError(err.message)
        setFieldErrors(err.fields || {})
      }
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  const retry = () => {
    if (!servicesLoaded) return loadServices()
    if (!resourcesLoaded && location.pathname.endsWith('/psicologo')) return loadResources()
    if (date) return loadSlots(date, { preserveSelection: true })
    return undefined
  }

  const value = {
    services, servicesLoaded, availableServices, resources, resourcesLoaded, slots,
    slotGroups: groupSlotsByResource(slots, selectedResource),
    selectedService, selectedResource, professionalChosen, date, selectedSlot,
    observacoes, submittedAppointment, loading, slotsLoading, error, dateError, fieldErrors, min,
    selectService, loadResources, selectResource, selectDate, selectSlot,
    setObservacoes, confirmAppointment, loadSlots, retry,
  }

  return <AgendamentoContext.Provider value={value}>{children}</AgendamentoContext.Provider>
}

export default AgendamentoProvider
