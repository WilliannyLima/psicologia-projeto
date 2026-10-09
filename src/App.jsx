import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { STORAGE_KEYS, readStoredJSON, clearStoredAuth, apiRequest, writeStoredJSON, hasPermission } from './services/api.js'
import { formatDisplayName } from './utils/formatters.js'
import PsychologistsPage from './pages/PsychologistsPage.jsx'
import Alert from './components/ui/Alert.jsx'
import AdminRequestsPage from './pages/AdminRequestsPage.jsx'
import AdminReviewsPage from './pages/AdminReviewsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import AppointmentFlowPage from './pages/AppointmentFlowPage.jsx'
import MyAppointmentsPage from './pages/MyAppointmentsPage.jsx'
import AdminResourcesPage from './pages/AdminResourcesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import AppointmentDetailPage from './pages/AppointmentDetailPage.jsx'
import AdminBusinessPage from './pages/AdminBusinessPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminAvailabilityPage from './pages/AdminAvailabilityPage.jsx'
import AdminAppointmentDetailPage from './pages/AdminAppointmentDetailPage.jsx'
import ReviewAppointmentPage from './pages/ReviewAppointmentPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import AdminServiceFormPage from './pages/AdminServiceFormPage.jsx'
import AdminAgendaPage from './pages/AdminAgendaPage.jsx'
import AdminServicesPage from './pages/AdminServicesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ProfileAvatar from './components/ui/ProfileAvatar.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import AdminResourceFormPage from './pages/AdminResourceFormPage.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import PsychologistDetailPage from './pages/PsychologistDetailPage.jsx'


function App() {
  const [tokens, setTokens] = useState(() => readStoredJSON(STORAGE_KEYS.tokens))
  const [profile, setProfile] = useState(() => readStoredJSON(STORAGE_KEYS.profile))
  const [flash, setFlash] = useState({ type: 'success', message: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    writeStoredJSON(STORAGE_KEYS.tokens, tokens)
  }, [tokens])

  useEffect(() => {
    writeStoredJSON(STORAGE_KEYS.profile, profile)
  }, [profile])

  useEffect(() => {
    if (flash.message !== 'Sessão encerrada com sucesso.') return

    const timeout = window.setTimeout(() => setFlash({ type: 'success', message: '' }), 5000)
    return () => window.clearTimeout(timeout)
  }, [flash])

  useEffect(() => {
    if (!tokens?.access || profile) return

    const loadProfile = async () => {
      try {
        const response = await apiRequest('/auth/eu/')
        setProfile(response)
      } catch (error) {
        if (error.status === 401) {
          clearStoredAuth()
          setTokens(null)
          setProfile(null)
        }
      }
    }

    loadProfile()
  }, [tokens?.access, profile])

  const handleAuthSuccess = (nextTokens, nextProfile) => {
    setFlash({ type: 'success', message: '' })
    setTokens(nextTokens)
    setProfile(nextProfile)
  }

  const logout = () => {
    clearStoredAuth()
    setTokens(null)
    setProfile(null)
    setFlash({ type: 'info', message: 'Sessão encerrada com sucesso.' })
  }

  const canAdmin = Boolean(
    profile?.permissoes?.includes('api.change_organizacao'),
  )

  const closeSidebar = () => setSidebarOpen(false)
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const isResetPage = location.pathname === '/esqueci-minha-senha'
  const isLandingPage = location.pathname === '/'

  return (
      <div className={`app-shell ${tokens ? 'authenticated-shell' : 'public-shell'} ${isLoginPage ? 'login-shell' : ''} ${isResetPage ? 'reset-shell' : ''} ${isLandingPage ? 'landing-shell' : ''}`}>
        {tokens ? (
          <>
            <button
              type="button"
              className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
              aria-label="Fechar menu"
              onClick={closeSidebar}
            />
            <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
              <Link to="/" className="brand" onClick={closeSidebar}>
                <span className="brand-mark">P</span>
                <span>
                  <strong>Psicologia</strong>
                  <small>Cuidado que acolhe</small>
                </span>
              </Link>
              <p className="sidebar-label">{canAdmin ? 'Gestão' : 'Seu espaço'}</p>
              <nav className="side-nav" aria-label="Navegação principal">
                <NavLink to={canAdmin ? '/admin' : '/dashboard'} onClick={closeSidebar}>
                  <span aria-hidden="true">⌂</span> Visão geral
                </NavLink>
                {!canAdmin ? (
                  <>
                    {hasPermission(profile?.permissoes, 'api.add_agendamento') ? <NavLink to="/agendar" onClick={closeSidebar}><span aria-hidden="true">＋</span> Agendar sessão</NavLink> : null}
                    <NavLink to="/minhas-sessoes" onClick={closeSidebar}><span aria-hidden="true">◷</span> Minhas sessões</NavLink>
                    <NavLink to="/psicologos" onClick={closeSidebar}><span aria-hidden="true">♧</span> Profissionais</NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/admin/agenda" onClick={closeSidebar}><span aria-hidden="true">◷</span> Agenda</NavLink>
                    <NavLink to="/admin/solicitacoes" onClick={closeSidebar}><span aria-hidden="true">!</span> A confirmar</NavLink>
                    <NavLink to="/admin/organizacao" onClick={closeSidebar}><span aria-hidden="true">▦</span> Negócio</NavLink>
                    <NavLink to="/admin/psicologos" onClick={closeSidebar}><span aria-hidden="true">♧</span> Psicólogos</NavLink>
                    <NavLink to="/admin/servicos" onClick={closeSidebar}><span aria-hidden="true">▤</span> Serviços</NavLink>
                    <NavLink to="/admin/avaliacoes" onClick={closeSidebar}><span aria-hidden="true">★</span> Avaliações</NavLink>
                  </>
                )}
                <NavLink to="/perfil" onClick={closeSidebar}><span aria-hidden="true">◯</span> Meu perfil</NavLink>
              </nav>
              <div className="sidebar-footer">
                <div className="sidebar-user">
                  <ProfileAvatar profile={profile} />
                  <span><strong>{profile?.nome || 'Minha conta'}</strong><small>{canAdmin ? 'Administrador' : 'Paciente'}</small></span>
                </div>
                <button type="button" className="logout-button" onClick={logout}>↪ <span>Sair da conta</span></button>
              </div>
            </aside>
          </>
        ) : !isLoginPage ? (
          <header className="topbar">
            <Link to="/" className="brand">
              <span className="brand-mark">P</span>
              <span><strong>Espaço Acolher</strong><small>PSICOLOGIA</small></span>
            </Link>
            <nav className="main-nav" aria-label="Navegação principal">
            {!tokens ? (
              <>
                <NavLink to="/">Início</NavLink>
                {location.pathname === '/' ? <a href="#beneficios">Serviços</a> : null}
                {location.pathname === '/' ? <a href="#profissionais">Psicólogos</a> : null}
                {location.pathname === '/' ? <a href="#sobre">Sobre nós</a> : null}
                <NavLink to="/login">Entrar</NavLink>
                <NavLink to="/cadastro">Criar conta</NavLink>
              </>
            ) : (
              <>
                <NavLink to={canAdmin ? '/admin' : '/dashboard'}>Início</NavLink>
                {!canAdmin ? (
                  <>
                    {hasPermission(profile?.permissoes, 'api.add_agendamento') ? <NavLink to="/agendar">Agendar</NavLink> : null}
                    <NavLink to="/minhas-sessoes">Minhas sessões</NavLink>
                    <NavLink to="/psicologos">Psicólogos</NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/admin/agenda">Agenda</NavLink>
                    <NavLink to="/admin/solicitacoes">A confirmar</NavLink>
                    <NavLink to="/admin/organizacao">Negócio</NavLink>
                    <NavLink to="/admin/psicologos">Psicólogos</NavLink>
                    <NavLink to="/admin/servicos">Serviços</NavLink>
                    <NavLink to="/admin/avaliacoes">Avaliações</NavLink>
                  </>
                )}
                <NavLink to="/perfil">Perfil</NavLink>
                <button type="button" className="button-ghost" onClick={logout}>
                  Sair
                </button>
              </>
            )}
            </nav>
          </header>
        ) : null}

        <div className="main-area">
          {tokens ? (
            <header className="app-header">
              <button type="button" className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
                <span />
                <span />
                <span />
              </button>
              <div className="header-context">
                <span className="header-kicker">{canAdmin ? 'Painel administrativo' : 'Espaço de cuidado'}</span>
                <strong>{canAdmin ? 'Gestão do consultório' : `Olá, ${formatDisplayName(profile?.nome)}!`}</strong>
                {!canAdmin ? <span className="header-description">Encontre o profissional ideal para acompanhar você.</span> : null}
              </div>
              <Link to="/perfil" className="header-profile">
                <ProfileAvatar profile={profile} size="header" />
                <span>
                  <strong>{profile?.nome || 'Meu perfil'}</strong>
                <small className="header-role">{canAdmin ? 'Administrador' : 'Paciente'}</small>
                  <small className="header-profile-link">Ver meu perfil</small>
                </span>
              </Link>
            </header>
          ) : null}
          <main className="page-shell">
          {flash.message ? <Alert type={flash.type} message={flash.message} /> : null}

          <Routes>
            <Route path="/" element={tokens ? (profile ? <Navigate to={canAdmin ? '/admin' : '/dashboard'} replace /> : null) : <LandingPage />} />
            <Route
              path="/login"
              element={tokens ? (profile ? <Navigate to={canAdmin ? '/admin' : '/dashboard'} replace /> : null) : <LoginPage onAuthSuccess={handleAuthSuccess} />}
            />
            <Route path="/cadastro" element={<RegisterPage onAuthSuccess={handleAuthSuccess} />} />
            <Route path="/esqueci-minha-senha" element={<ResetPasswordPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <DashboardPage profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agendar"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && hasPermission(profile?.permissoes, 'api.add_agendamento')}>
                  <AppointmentFlowPage profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/minhas-sessoes"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <MyAppointmentsPage profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessao/:id"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <AppointmentDetailPage profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessao/:id/avaliar"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <ReviewAppointmentPage profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/psicologos"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <PsychologistsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/psicologo/:id"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <PsychologistDetailPage profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <ProfilePage profile={profile} onLogout={logout} onProfileChange={setProfile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alterar-senha"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/agenda"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminAgendaPage permissions={profile?.permissoes} />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/sessao/:id" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminAppointmentDetailPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route
              path="/admin/solicitacoes"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminRequestsPage permissions={profile?.permissoes} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/organizacao"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminBusinessPage permissions={profile?.permissoes} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/avaliacoes"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminReviewsPage permissions={profile?.permissoes} />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/psicologos" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminResourcesPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route path="/admin/psicologos/novo" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminResourceFormPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route path="/admin/psicologos/:id/editar" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminResourceFormPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route path="/admin/psicologos/:id/horarios" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminAvailabilityPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route path="/admin/servicos" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminServicesPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route path="/admin/servicos/novo" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminServiceFormPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route path="/admin/servicos/:id/editar" element={<ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}><AdminServiceFormPage permissions={profile?.permissoes} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>
        </div>
      </div>
  )
}

export default App
