import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { formatDisplayName } from '../utils/formatters.js'
import { useAuth } from '../AuthContext.js'
import { Erro } from './Erro.jsx'
import { Foto } from './Foto.jsx'
import { Menu } from './Menu.jsx'

export function Layout() {
  const { profile, isAuthenticated, isAdmin, flash } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  if (!isAuthenticated) return <Outlet />
  return <div className="app-shell authenticated-shell"><button type="button" className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`} aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} /><Menu sidebarOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} /><div className="main-area"><header className="app-header"><button type="button" className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><span /><span /><span /></button><div className="header-context"><span className="header-kicker">{isAdmin ? 'Painel administrativo' : 'Espaço de cuidado'}</span><strong>{isAdmin ? 'Gestão do consultório' : `Olá, ${formatDisplayName(profile?.nome)}!`}</strong>{!isAdmin ? <span className="header-description">Encontre o profissional ideal para acompanhar você.</span> : null}</div><Link to="/perfil" className="header-profile"><Foto profile={profile} size="header" /><span><strong>{profile?.nome || 'Meu perfil'}</strong><small className="header-role">{isAdmin ? 'Administrador' : 'Paciente'}</small><small className="header-profile-link">Ver meu perfil</small></span></Link></header><main className="page-shell">{flash.message ? <Erro type={flash.type} message={flash.message} /> : null}<Outlet /></main></div></div>
}

export default Layout
