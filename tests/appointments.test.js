import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAppointmentPayload, formatLocalDate, groupSlotsByResource, isSelectableDate, resolveRelatedName } from '../src/utils/appointments.js'

test('formata datas usando o calendário local', () => {
  assert.equal(formatLocalDate(new Date(2026, 9, 13, 23, 30)), '2026-10-13')
})

test('rejeita datas inválidas, incompletas, antigas e anteriores ao mínimo', () => {
  assert.equal(isSelectableDate('2026-10-12', '2026-10-13'), false)
  assert.equal(isSelectableDate('2026-10-13', '2026-10-13'), true)
  assert.equal(isSelectableDate('2026-1-13', '2026-10-13'), false)
  assert.equal(isSelectableDate('1999-10-13', '2026-10-13'), false)
})

test('agrupa horários de profissionais distintos sem fundir horários iguais', () => {
  const slots = [
    { inicio: '2026-10-13T13:00:00-03:00', recurso: { id: 8, nome: 'Dra. Ana' } },
    { inicio: '2026-10-13T13:00:00-03:00', recurso: { id: 9, nome: 'Dr. Bruno' } },
  ]
  const groups = groupSlotsByResource(slots, null)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups.map((group) => group.nome), ['Dra. Ana', 'Dr. Bruno'])
})

test('monta payload com serviço, recurso, início e observações', () => {
  assert.deepEqual(buildAppointmentPayload({
    selectedService: { id: 3 },
    selectedResource: null,
    selectedSlot: { inicio: '2026-10-13T13:00:00-03:00', recurso: { id: 8 } },
    observacoes: 'Prefiro o período da tarde',
  }), {
    servico: 3,
    recurso: 8,
    inicio: '2026-10-13T13:00:00-03:00',
    observacoes: 'Prefiro o período da tarde',
  })
})

test('não cria agendamento sem profissional e resolve IDs para nomes', () => {
  assert.throws(() => buildAppointmentPayload({
    selectedService: { id: 3 },
    selectedResource: null,
    selectedSlot: { inicio: '2026-10-13T13:00:00-03:00' },
    observacoes: '',
  }))
  assert.equal(resolveRelatedName(8, [{ id: 8, nome: 'Dra. Ana' }]), 'Dra. Ana')
  assert.equal(resolveRelatedName(99, []), null)
})
