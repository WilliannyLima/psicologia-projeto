import { useAuth } from '../../AuthContext.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../../api/client.js'
import { Erro } from '../../components/Erro.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'
import { Foto } from '../../components/Foto.jsx'
import { EstadoVazio } from '../../components/EstadoVazio.jsx'

export function PsicologosAdmin() {
  const { profile } = useAuth()
  const permissions = profile?.permissoes
  const [active, setActive] = useState('true'); const [resources, setResources] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const canAdd = hasPermission(permissions, 'api.add_recurso')
  const canChange = hasPermission(permissions, 'api.change_recurso')
  const load = async () => { try { setLoading(true); setError(''); setResources(await fetchAllPages(`/recursos/?ativo=${active}`)) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [active])
  const toggle = async (resource) => { const isActive = resource.ativo !== false; const actionLabel = isActive ? 'desativar' : 'ativar'; if (!window.confirm(`Deseja ${actionLabel} este psicólogo?`)) return; try { await apiRequest(`/recursos/${resource.id}/`, { method: 'PATCH', body: { ativo: !isActive } }); await load() } catch (err) { setError(err.message) } }
  return <section className="page-block"><CabecalhoPagina title="Psicólogos" subtitle="Gerencie profissionais ativos e inativos." backLabel="Voltar para administração" backTo="/admin">{canAdd ? <Link to="/admin/psicologos/novo" className="button-primary">Novo psicólogo</Link> : null}</CabecalhoPagina><div className="meta-actions"><button className={active === 'true' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('true')}>Ativos</button><button className={active === 'false' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('false')}>Inativos</button></div>{loading ? <Carregando message="Carregando psicólogos" /> : null}{error ? <><Erro type="danger" message={error} /><button className="button-secondary" onClick={load}>Tentar de novo</button></> : null}{!loading && !error && !resources.length ? <EstadoVazio title="Nenhum psicólogo encontrado" description="Não há profissionais para este filtro." /> : <div className="staff-grid">{resources.map((resource) => { const isActive = resource.ativo !== false; return <article className="card staff-card" key={resource.id}><Foto profile={resource} size="professional" /><div className="staff-card-content"><h3>{resource.nome}</h3>{resource.bio ? <p>{resource.bio}</p> : null}{resource.capacidade !== undefined ? <span>Capacidade: {resource.capacidade}</span> : null}<span className="badge">{isActive ? 'Ativo' : 'Inativo'}</span></div>{canChange ? <div className="meta-actions"><Link to={`/admin/psicologos/${resource.id}/editar`} className="button-primary small-button">Editar</Link><Link to={`/admin/psicologos/${resource.id}/horarios`} className="button-secondary small-button">Horários</Link><button className="button-ghost small-button" onClick={() => toggle(resource)}>{isActive ? 'Desativar' : 'Ativar'}</button></div> : null}</article> })}</div>}</section>
}

export default PsicologosAdmin
