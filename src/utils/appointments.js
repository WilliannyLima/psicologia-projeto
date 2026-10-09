export function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isSelectableDate(value, minimumDate) {
  return typeof value === 'string' && value.length === 10 && Number(value.slice(0, 4)) >= 2000 && value >= minimumDate
}

export function groupSlotsByResource(slots, selectedResource) {
  const groups = new Map()

  for (const slot of slots) {
    const id = slot.recurso?.id ?? selectedResource?.id ?? 'x'
    if (!groups.has(String(id))) {
      groups.set(String(id), {
        id,
        nome: slot.recurso?.nome || selectedResource?.nome || 'Profissional',
        horarios: [],
      })
    }
    groups.get(String(id)).horarios.push(slot)
  }

  return [...groups.values()]
}

export function resolveRelatedName(value, options = [], explicitName) {
  if (explicitName && typeof explicitName === 'string' && Number.isNaN(Number(explicitName))) return explicitName
  if (value && typeof value === 'object') {
    if (value.nome || value.name) return value.nome || value.name
    value = value.id
  }
  if (typeof value === 'string' && Number.isNaN(Number(value))) return value
  if (value === undefined || value === null) return null
  return options.find((option) => Number(option.id) === Number(value))?.nome || null
}

export function buildAppointmentPayload({ selectedService, selectedResource, selectedSlot, observacoes }) {
  const recursoId = selectedResource?.id || selectedSlot?.recurso?.id
  if (!selectedService?.id || !selectedSlot?.inicio || !recursoId) {
    throw new Error('Agendamento incompleto: serviço, profissional e horário são obrigatórios.')
  }

  return {
    servico: selectedService.id,
    recurso: recursoId,
    inicio: selectedSlot.inicio,
    observacoes,
  }
}
