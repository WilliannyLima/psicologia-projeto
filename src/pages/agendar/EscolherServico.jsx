import { useAgendamento } from './AgendamentoContext.js'
import { EstadoVazio } from '../../components/EstadoVazio.jsx'
import { formatCurrency } from '../../utils/formatters.js'

export function EscolherServico() {
  const { availableServices, selectService } = useAgendamento()
  return <div className="card section-card"><h3>Escolha o serviço</h3>{availableServices.length === 0 ? <EstadoVazio title="Nenhum serviço disponível" description="Ainda não há serviços disponíveis para agendamento." /> : <div className="service-grid">{availableServices.map((service) => <button type="button" key={service.id} className="service-card" onClick={() => selectService(service)}>{service.imagem || service.imagem_url ? <img src={service.imagem || service.imagem_url} alt="" /> : null}<strong>{service.nome}</strong>{service.descricao ? <span>{service.descricao}</span> : null}{service.duracao_min !== undefined ? <em>{service.duracao_min} min</em> : null}{service.preco !== undefined ? <b>{formatCurrency(service.preco)}</b> : null}</button>)}</div>}</div>
}

export default EscolherServico
