import { Link, NavLink, useLocation } from 'react-router-dom'
import { hasPermission } from '../api/client.js'
import { useAuth } from '../AuthContext.js'
import { Foto } from './Foto.jsx'

export function Marca({ publicPage = false }) {
  return <Link to="/" className="brand"><span className="brand-mark">P</span><span><strong>{publicPage ? 'Espaço Acolher' : 'Psicologia'}</strong><small>{publicPage ? 'PSICOLOGIA' : 'Cuidado que acolhe'}</small></span></Link>
}

export function Menu({ onNavigate = () => {}, sidebarOpen = false }) {
  const { profile, logout, isAdmin, isAuthenticated } = useAuth()
  const location = useLocation()
  if (isAuthenticated) {
    return (
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div onClick={onNavigate}><Marca /></div>
        <p className="sidebar-label">{isAdmin ? 'Gestão' : 'Seu espaço'}</p>
        <nav className="side-nav" aria-label="Navegação principal">
          <NavLink to={isAdmin ? '/admin' : '/dashboard'} onClick={onNavigate}><span aria-hidden="true">⌂</span> Visão geral</NavLink>
          {!isAdmin ? <>
            {hasPermission(profile?.permissoes, 'api.add_agendamento') ? <NavLink to="/agendar" onClick={onNavigate}><span aria-hidden="true">＋</span> Agendar sessão</NavLink> : null}
            <NavLink to="/minhas-sessoes" onClick={onNavigate}><span aria-hidden="true">◷</span> Minhas sessões</NavLink>
            <NavLink to="/psicologos" onClick={onNavigate}><span aria-hidden="true">♧</span> Profissionais</NavLink>
          </> : <>
            <NavLink to="/admin/agenda" onClick={onNavigate}><span aria-hidden="true">◷</span> Agenda</NavLink>
            <NavLink to="/admin/solicitacoes" onClick={onNavigate}><span aria-hidden="true">!</span> A confirmar</NavLink>
            <NavLink to="/admin/historico-solicitacoes" onClick={onNavigate}><span aria-hidden="true">◷</span> Histórico de solicitações</NavLink>
            <NavLink to="/admin/organizacao" onClick={onNavigate}><span aria-hidden="true">▦</span> Negócio</NavLink>
            <NavLink to="/admin/psicologos" onClick={onNavigate}><span aria-hidden="true">♧</span> Psicólogos</NavLink>
            <NavLink to="/admin/servicos" onClick={onNavigate}><span aria-hidden="true">▤</span> Serviços</NavLink>
            <NavLink to="/admin/avaliacoes" onClick={onNavigate}><span aria-hidden="true">★</span> Avaliações</NavLink>
          </>}
          <NavLink to="/perfil" onClick={onNavigate}><span aria-hidden="true">◉</span> Meu perfil</NavLink>
        </nav>
        <div className="sidebar-footer"><div className="sidebar-user"><Foto profile={profile} /><span><strong>{profile?.nome || 'Minha conta'}</strong><small>{isAdmin ? 'Administrador' : 'Paciente'}</small></span></div><button type="button" className="logout-button" onClick={logout}>↪ <span>Sair da conta</span></button></div>
      </aside>
    )
  }
  if (location.pathname === '/login') return null
  return <header className="topbar"><Marca publicPage /><nav className="main-nav" aria-label="Navegação principal"><NavLink to="/">Início</NavLink>{location.pathname === '/' ? <><a href="#beneficios">Serviços</a><a href="#profissionais">Psicólogos</a><a href="#sobre">Sobre nós</a></> : null}<NavLink to="/login">Entrar</NavLink><NavLink to="/cadastro">Criar conta</NavLink></nav></header>
}

export default Menu
