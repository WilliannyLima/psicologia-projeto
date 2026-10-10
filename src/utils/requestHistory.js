import { formatLocalDate } from './appointments.js'

export const PROCESSED_APPOINTMENT_STATUSES = ['confirmado', 'cancelado', 'concluido']

export function getAppointmentPatientName(appointment) {
  return appointment?.cliente?.nome || appointment?.cliente_nome || appointment?.paciente?.nome || 'Paciente não informado'
}

export function deduplicateAppointments(appointments) {
  const seen = new Set()
  return appointments.filter((appointment) => {
    if (appointment?.id === undefined || appointment?.id === null || seen.has(String(appointment.id))) return false
    seen.add(String(appointment.id))
    return true
  })
}

export function filterProcessedAppointments(appointments, filters = {}) {
  const status = filters.status || 'todos'
  const patient = (filters.patient || '').trim().toLocaleLowerCase('pt-BR')
  const date = filters.date || ''

  return appointments.filter((appointment) => {
    if (!PROCESSED_APPOINTMENT_STATUSES.includes(appointment.status)) return false
    if (status !== 'todos' && appointment.status !== status) return false
    if (patient && !getAppointmentPatientName(appointment).toLocaleLowerCase('pt-BR').includes(patient)) return false
    if (date) {
      const appointmentDate = typeof appointment.inicio === 'string' && !Number.isNaN(Date.parse(appointment.inicio))
        ? formatLocalDate(new Date(appointment.inicio))
        : ''
      if (appointmentDate !== date) return false
    }
    return true
  })
}
