import { useAuth } from '../../AuthContext.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasPermission, fetchAllPages } from '../../api/client.js'
import { formatCurrency } from '../../utils/formatters.js'
import { Erro } from '../../components/Erro.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'
import { EstadoVazio } from '../../components/EstadoVazio.jsx'

export function Servicos() {
  const { profile } = useAuth()
  const permissions = profile?.permissoes
  const [active, setActive] = useState('true'); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const canAdd = hasPermission(permissions, 'api.add_servico')
  const canChange = hasPermission(permissions, 'api.change_servico')
  const load = async () => { try { setLoading(true); setError(''); setItems(await fetchAllPages(`/servicos/?ativo=${active}`)) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [active])
  return <section className="page-block"><CabecalhoPagina title="Serviços" subtitle="Gerencie os serviços oferecidos." backLabel="Voltar para administração" backTo="/admin">{canAdd ? <Link to="/admin/servicos/novo" className="button-primary">Novo serviço</Link> : null}</CabecalhoPagina><div className="meta-actions"><button className={active === 'true' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('true')}>Ativos</button><button className={active === 'false' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('false')}>Inativos</button></div>{loading ? <Carregando message="Carregando serviços" /> : null}{error ? <><Erro type="danger" message={error} /><button className="button-secondary" onClick={load}>Tentar de novo</button></> : null}<div className="service-grid">{!loading && !error && !items.length ? <EstadoVazio title="Nenhum serviço encontrado" description="Não há serviços para este filtro." /> : items.map((item) => <article className="card service-card" key={item.id}>{item.imagem ? <img src={item.imagem} alt="" /> : null}<strong>{item.nome}</strong>{item.descricao ? <span>{item.descricao}</span> : null}{item.duracao_min !== undefined ? <em>{item.duracao_min} min</em> : null}{item.preco !== undefined ? <b>{formatCurrency(item.preco)}</b> : null}<span className="badge">{item.ativo !== false ? 'Ativo' : 'Inativo'}</span>{canChange ? <Link className="button-primary small-button" to={`/admin/servicos/${item.id}/editar`}>Editar</Link> : null}</article>)}</div></section>
}

export default Servicos
