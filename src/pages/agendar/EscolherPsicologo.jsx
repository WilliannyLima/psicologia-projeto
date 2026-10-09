import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAgendamento } from './AgendamentoContext.js'
import { EstadoVazio } from '../../components/EstadoVazio.jsx'
import { Carregando } from '../../components/Carregando.jsx'

export function EscolherPsicologo() {
  const { selectedService, resources, resourcesLoaded, loading, loadResources, selectResource } = useAgendamento()
  const navigate = useNavigate()
  const requestedResources = useRef(false)
  useEffect(() => {
    if (selectedService && !resourcesLoaded && !loading && !requestedResources.current) {
      requestedResources.current = true
      loadResources()
    }
  }, [selectedService, resourcesLoaded, loading, loadResources])
  if (loading) return <Carregando message="Carregando psicólogos" />
  if (!resourcesLoaded) return null
  return <div className="card section-card"><button type="button" className="back-button" onClick={() => navigate('/agendar')}>← Voltar para serviços</button><h3>Escolha o psicólogo</h3>{resources.length === 0 ? <EstadoVazio title="Nenhum psicólogo realiza este serviço" description="Ainda não há profissionais disponíveis para este serviço." /> : <div className="staff-grid"><button type="button" className="staff-card" onClick={() => selectResource(null)}><div className="staff-card-content"><h3>Qualquer profissional</h3><p>Escolha entre os profissionais disponíveis para o serviço.</p></div></button>{resources.map((resource) => <article className="card staff-card" key={resource.id}><button type="button" className="staff-card-select" onClick={() => selectResource(resource)}><div className="staff-card-content">{resource.foto || resource.foto_url ? <img src={resource.foto || resource.foto_url} alt="" /> : null}<h3>{resource.nome}</h3>{resource.bio ? <p>{resource.bio}</p> : null}</div></button><Link to={`/psicologo/${resource.id}`} className="button-secondary small-button">Ver avaliações</Link></article>)}</div>}</div>
}

export default EscolherPsicologo
