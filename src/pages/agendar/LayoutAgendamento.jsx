import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAgendamento } from './AgendamentoContext.js'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Erro } from '../../components/Erro.jsx'
import { Carregando } from '../../components/Carregando.jsx'

export function LayoutAgendamento() {
  const location = useLocation()
  const { selectedService, professionalChosen, date, selectedSlot, submittedAppointment, loading, servicesLoaded, slotsLoading, error, retry } = useAgendamento()
  const pathname = location.pathname
  if (!servicesLoaded && loading) return <section className="page-block"><CabecalhoPagina title="Agendar sessão" subtitle="Escolha o serviço, os profissionais e o horário ideal." backLabel="Voltar para o painel" backTo="/dashboard" /><Carregando message="Carregando informações do agendamento" /></section>
  if (pathname.endsWith('/psicologo') && !selectedService) return <Navigate to="/agendar" replace />
  if (pathname.endsWith('/horario') && !selectedService) return <Navigate to="/agendar" replace />
  if (pathname.endsWith('/horario') && !professionalChosen) return <Navigate to="/agendar/psicologo" replace />
  if (pathname.endsWith('/confirmar')) {
    if (!selectedService) return <Navigate to="/agendar" replace />
    if (!professionalChosen) return <Navigate to="/agendar/psicologo" replace />
    if (!date) return <Navigate to="/agendar/horario" replace />
    if (slotsLoading) return <section className="page-block"><CabecalhoPagina title="Agendar sessão" /><Carregando message="Verificando se o horário continua disponível" /></section>
    if (!selectedSlot || !selectedSlot.inicio) return <Navigate to="/agendar/horario" replace />
  }
  if (pathname.endsWith('/enviado') && !submittedAppointment) {
    return <Navigate to={!selectedService ? '/agendar' : !professionalChosen ? '/agendar/psicologo' : !date ? '/agendar/horario' : '/agendar/confirmar'} replace />
  }
  return <section className="page-block"><CabecalhoPagina title="Agendar sessão" subtitle="Escolha o serviço, os profissionais e o horário ideal." backLabel="Voltar para o painel" backTo="/dashboard" />{error ? <><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={retry}>Tentar de novo</button></> : null}<Outlet /></section>
}

export default LayoutAgendamento
