import test from 'node:test'
import assert from 'node:assert/strict'
import { deduplicateAppointments, filterProcessedAppointments, getAppointmentPatientName } from '../src/utils/requestHistory.js'

const appointments = [
  { id: 1, status: 'confirmado', inicio: '2026-10-13T14:00:00-03:00', cliente: { nome: 'Ana Teste' } },
  { id: 2, status: 'cancelado', inicio: '2026-10-13T15:00:00-03:00', cliente_nome: 'Bruno' },
  { id: 3, status: 'concluido', inicio: '2026-10-14T14:00:00-03:00', paciente: { nome: 'Ana Teste' } },
  { id: 4, status: 'solicitado', inicio: '2026-10-13T16:00:00-03:00', cliente_nome: 'Ana Teste' },
]

test('filtra histórico por estado, nome do paciente e data do agendamento', () => {
  assert.deepEqual(filterProcessedAppointments(appointments, { status: 'confirmado' }).map((item) => item.id), [1])
  assert.deepEqual(filterProcessedAppointments(appointments, { patient: 'ana' }).map((item) => item.id), [1, 3])
  assert.deepEqual(filterProcessedAppointments(appointments, { date: '2026-10-13' }).map((item) => item.id), [1, 2])
  assert.deepEqual(filterProcessedAppointments(appointments, { status: 'cancelado', patient: 'BRU', date: '2026-10-13' }).map((item) => item.id), [2])
})

test('deduplica resultados por ID e não inclui solicitações pendentes como histórico', () => {
  const unique = deduplicateAppointments([...appointments, appointments[0]])
  assert.equal(unique.length, 4)
  assert.equal(filterProcessedAppointments(unique).some((item) => item.status === 'solicitado'), false)
})

test('usa os formatos conhecidos para o nome do paciente', () => {
  assert.equal(getAppointmentPatientName({ cliente: { nome: 'Ana' } }), 'Ana')
  assert.equal(getAppointmentPatientName({ cliente_nome: 'Bruno' }), 'Bruno')
  assert.equal(getAppointmentPatientName({}), 'Paciente não informado')
})
