import { createContext, useContext } from 'react'

export const AgendamentoContext = createContext(null)

export function useAgendamento() {
  const context = useContext(AgendamentoContext)
  if (!context) throw new Error('useAgendamento deve ser usado dentro de AgendamentoProvider.')
  return context
}
