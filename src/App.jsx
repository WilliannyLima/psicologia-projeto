import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://agendamentos.spaincentral.cloudapp.azure.com/api'

const STORAGE_KEYS = {
  tokens: 'psicologia_tokens',
  profile: 'psicologia_profile',
}

function readStoredJSON(key) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function writeStoredJSON(key, value) {
  if (!value) {
    localStorage.removeItem(key)
    return
  }
  localStorage.setItem(key, JSON.stringify(value))
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEYS.tokens)
  localStorage.removeItem(STORAGE_KEYS.profile)
}

function normalizeErrorMessage(payload) {
  if (!payload) return 'Não foi possível concluir a operação.'

  if (typeof payload === 'string') return payload

  if (payload.detail) return payload.detail

  if (payload.non_field_errors) {
    const value = payload.non_field_errors
    return Array.isArray(value) ? value.join(', ') : String(value)
  }

  if (Array.isArray(payload)) {
    return payload.join(', ')
  }

  if (typeof payload === 'object') {
    const flatEntries = Object.entries(payload)
      .map(([, value]) => {
        if (Array.isArray(value)) return value.join(', ')
        if (typeof value === 'object' && value !== null) return Object.values(value).join(', ')
        return String(value)
      })
      .filter(Boolean)

    if (flatEntries.length > 0) return flatEntries.join(' • ')
  }

  return 'Erro inesperado. Tente novamente.'
}

function authenticationErrorMessage(error, fallback) {
  if (error?.status === 400) return fallback
  if (error?.status === 429) return 'Muitas tentativas, aguarde um minuto.'
  if (error?.status === 403) return 'Você não tem permissão para esta ação.'
  return error?.message || fallback
}

function responseList(response) {
  return Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
}

async function fetchAllPages(path) {
  const items = []
  let nextPath = path

  while (nextPath) {
    const response = await apiRequest(nextPath)
    items.push(...responseList(response))
    if (!response?.next) break
    const nextUrl = new URL(response.next, window.location.origin)
    nextPath = `${nextUrl.pathname.replace('/api', '')}${nextUrl.search}`
  }

  return items
}

function hasPermission(permissions, permission) {
  return Array.isArray(permissions) && permissions.includes(permission)
}

function extractFieldErrors(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  const fieldErrors = {}

  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'detail' || key === 'non_field_errors') return

    const formatted = Array.isArray(value)
      ? value.join(' ')
      : typeof value === 'object' && value !== null
        ? Object.values(value).flat().join(' ')
        : String(value)

    if (formatted) fieldErrors[key] = formatted
  })

  if (Object.keys(fieldErrors).length === 0 && payload.non_field_errors) {
    const value = payload.non_field_errors
    fieldErrors.general = Array.isArray(value) ? value.join(' ') : String(value)
  }

  return fieldErrors
}

async function apiRequest(path, options = {}) {
  const { _retried = false, _skipAuth = false, ...fetchOptions } = options
  const storedTokens = readStoredJSON(STORAGE_KEYS.tokens)
  const token = storedTokens?.access
  const headers = { ...(fetchOptions.headers || {}) }

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  if (token && !_skipAuth && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  const requestInit = {
    ...fetchOptions,
    headers,
  }

  if (fetchOptions.body !== undefined) {
    requestInit.body =
      fetchOptions.body instanceof FormData ? fetchOptions.body : JSON.stringify(fetchOptions.body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, requestInit)

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null)

  if (response.status === 401 && token && !_retried && path !== '/auth/renovar/') {
    const refresh = storedTokens?.refresh

    if (refresh) {
      try {
        const renewal = await apiRequest('/auth/renovar/', {
          method: 'POST',
          body: { refresh },
          _retried: true,
          _skipAuth: true,
        })
        const nextTokens = { ...storedTokens, ...renewal }
        writeStoredJSON(STORAGE_KEYS.tokens, nextTokens)
        return apiRequest(path, { ...fetchOptions, _retried: true })
      } catch {
        clearStoredAuth()
      }
    } else {
      clearStoredAuth()
    }

    window.location.assign('/login')
  }

  if (!response.ok) {
    const error = new Error(normalizeErrorMessage(payload))
    error.status = response.status
    error.fields = extractFieldErrors(payload)
    if (response.status === 403) error.message = 'Você não tem permissão para esta ação.'
    if (response.status === 429) error.message = 'Muitas tentativas, aguarde um minuto.'
    throw error
  }

  return payload
}

function formatCurrency(value) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

function formatDate(dateString) {
  if (!dateString) return 'Data não informada'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatStatus(status) {
  const map = {
    solicitado: 'Solicitado',
    confirmado: 'Confirmado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    ativo: 'Ativo',
    inativo: 'Inativo',
  }

  return map[status] || status || 'Sem status'
}

function BackButton({ label = 'Voltar', to }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="back-button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <span aria-hidden="true">←</span> {label}
    </button>
  )
}

function PageHeader({ title, subtitle, children, backLabel, backTo }) {
  return (
    <div className="page-header">
      <div>
        {backLabel ? <BackButton label={backLabel} to={backTo} /> : null}
        <p className="eyebrow">Psicologia</p>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, accent = 'primary' }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Alert({ type = 'info', message }) {
  if (!message) return null

  return <div className={`alert alert-${type}`}>{message}</div>
}

function LoadingState({ message = 'Carregando informações...' }) {
  return (
    <div className="loading-box">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  )
}

function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

function getProfilePhoto(profile) {
  return profile?.foto || profile?.foto_url || profile?.avatar || profile?.avatar_url || ''
}

function formatDisplayName(name) {
  if (!name) return 'seja bem-vindo(a)'
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function getProfessionalPhoto(professional) {
  return professional?.foto || professional?.foto_url || professional?.imagem || professional?.imagem_url || ''
}

function ProfileAvatar({ profile, size = 'default', className = '' }) {
  const photo = getProfilePhoto(profile)
  const initial = (profile?.nome || 'P').charAt(0).toUpperCase()

  return (
    <span className={`profile-avatar profile-avatar-${size} ${className}`.trim()}>
      {photo ? (
        <img src={photo} alt={`Foto de ${profile?.nome || 'usuário'}`} />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  )
}

function ProfilePhotoUpload({ profile, onProfileChange }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const preview = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : ''),
    [selectedFile],
  )

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    setSuccess('')

    if (!file) return

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024

    if (!acceptedTypes.includes(file.type)) {
      setError('Escolha uma imagem JPG, JPEG, PNG ou WEBP.')
      return
    }

    if (file.size > maxSize) {
      setError('A imagem deve ter no máximo 5 MB.')
      return
    }

    setSelectedFile(file)
  }

  const cancelSelection = () => {
    setSelectedFile(null)
    setError('')
    setSuccess('')
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setLoading(true)
      setError('')
      const body = new FormData()
      body.append('foto', selectedFile)
      const response = await apiRequest('/auth/eu/', { method: 'PATCH', body })
      onProfileChange(response)
      setSelectedFile(null)
      setSuccess('Foto de perfil atualizada com sucesso.')
    } catch (err) {
      setError(
        err.status === 400
          ? 'O arquivo precisa ser uma imagem.'
          : err.message || 'Não foi possível atualizar sua foto.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    try {
      setLoading(true)
      setError('')
      const body = new FormData()
      body.append('foto', '')
      const response = await apiRequest('/auth/eu/', { method: 'PATCH', body })
      onProfileChange(response)
      setSuccess('Foto de perfil removida com sucesso.')
    } catch (err) {
      setError(err.status === 400 ? 'Não foi possível remover a foto.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const currentProfile = selectedFile ? { ...profile, foto: preview } : profile

  return (
    <div className="profile-photo-section">
      <div className="profile-photo-preview">
        <ProfileAvatar profile={currentProfile} size="profile" />
        <label className="profile-photo-overlay" htmlFor="profile-photo-input">
          <span aria-hidden="true">📷</span>
          <span>{selectedFile ? 'Trocar imagem' : 'Alterar foto'}</span>
        </label>
      </div>
      <div className="profile-photo-copy">
        <p className="eyebrow">Foto de perfil</p>
        <h2>{selectedFile ? 'Pré-visualização' : 'Personalize seu perfil'}</h2>
        <p>Escolha uma foto para personalizar seu perfil. JPG, PNG ou WEBP, até 5 MB.</p>
        <div className="profile-photo-actions">
          <label className="button-secondary" htmlFor="profile-photo-input">
            {getProfilePhoto(profile) ? 'Alterar foto' : 'Adicionar foto'}
          </label>
          {getProfilePhoto(profile) ? (
            <button type="button" className="button-ghost" onClick={handleRemove} disabled={loading}>
              Remover foto
            </button>
          ) : null}
          <input
            id="profile-photo-input"
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Selecionar foto de perfil"
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <>
              <button type="button" className="button-primary" onClick={handleUpload} disabled={loading}>
                {loading ? 'Salvando...' : 'Confirmar foto'}
              </button>
              <button type="button" className="button-ghost" onClick={cancelSelection} disabled={loading}>
                Cancelar
              </button>
            </>
          ) : null}
        </div>
        {error ? <Alert type="danger" message={error} /> : null}
        {success ? <Alert type="success" message={success} /> : null}
      </div>
    </div>
  )
}

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

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
    profile?.permissoes?.includes('api.change_organizacao') ||
      profile?.permissoes?.includes('change_organizacao'),
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
                  <small className="header-role">Paciente</small>
                  <small className="header-profile-link">Ver meu perfil</small>
                </span>
              </Link>
            </header>
          ) : null}
          <main className="page-shell">
          {flash.message ? <Alert type={flash.type} message={flash.message} /> : null}

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onAuthSuccess={handleAuthSuccess} />} />
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
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
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
                  <AppointmentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessao/:id/avaliar"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens)}>
                  <ReviewAppointmentPage />
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
                  <PsychologistDetailPage />
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

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-entry">
        <div className="hero-copy">
          <div className="landing-brand">
            <span className="landing-lotus" aria-hidden="true">✦</span>
            <span><strong>Espaço Acolher</strong><small>PSICOLOGIA</small></span>
          </div>
          <div className="landing-copy">
            <p className="eyebrow">Cuidado <span>•</span> Escuta <span>•</span> Bem-estar</p>
            <h1>Cuidar de você<br />também é um ato<br /><em>de coragem.</em></h1>
            <p className="hero-description">
              Aqui você encontra um espaço seguro para se ouvir, se cuidar e viver melhor.
            </p>
            <Link to="/login" className="button-primary hero-cta">
              Começar <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="entry-scene" aria-label="Ambiente acolhedor de psicologia">
          <div className="scene-halo" />
          <div className="scene-wall" />
          <div className="scene-window"><span /></div>
          <div className="scene-plant scene-plant-left"><i /><i /><i /><b /></div>
          <div className="scene-plant scene-plant-right"><i /><i /><i /><b /></div>
          <div className="scene-chair"><span className="chair-back" /><span className="chair-seat" /><span className="chair-leg chair-leg-left" /><span className="chair-leg chair-leg-right" /></div>
          <div className="scene-table"><span /><b /></div>
          <div className="scene-rug" />
        </div>
      </section>
    </main>
  )
}

function LoginPage({ onAuthSuccess }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ organizacao: 'psicologia', email: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const loginResponse = await apiRequest('/auth/login/', {
        method: 'POST',
        body: {
          organizacao: form.organizacao,
          email: form.email,
          senha: form.senha,
        },
      })
      writeStoredJSON(STORAGE_KEYS.tokens, loginResponse)

      const profileResponse = await apiRequest('/auth/eu/')

      onAuthSuccess(loginResponse, profileResponse)
      navigate(profileResponse.permissoes?.includes('api.change_organizacao') ? '/admin' : '/dashboard')
    } catch (err) {
      if (err.status === 400) {
        setError('Organização, e-mail ou senha inválidos')
      } else {
        setError(authenticationErrorMessage(err, 'Não foi possível entrar. Verifique seu e-mail e senha.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-layout login-page">
      <button type="button" className="login-back-button" onClick={() => navigate('/')}>
        <span aria-hidden="true">←</span> Voltar para o início
      </button>
      <div className="card auth-card">
        <div className="login-brand">
          <span className="landing-lotus" aria-hidden="true">✦</span>
          <span><strong>Espaço Acolher</strong><small>PSICOLOGIA</small></span>
        </div>
        <p className="login-kicker">Sua jornada continua</p>
        <h2>Bem-vindo de volta!</h2>
        <p className="login-intro">Entre com sua conta para continuar.</p>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="seuemail@exemplo.com"
              required
            />
          </label>
          <label>
            Senha
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="senha"
                value={form.senha}
                onChange={handleChange}
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
          </label>

          {error ? <Alert type="danger" message={error} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-links">
          <Link className="forgot-link" to="/esqueci-minha-senha">Esqueci minha senha</Link>
          <p>Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link></p>
        </div>
      </div>
      <div className="login-orb login-orb-one" aria-hidden="true" />
      <div className="login-orb login-orb-two" aria-hidden="true" />
    </section>
  )
}

function RegisterPage({ onAuthSuccess }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ organizacao: 'psicologia', nome: '', email: '', senha: '', confirmacao: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))

    if (fieldErrors[name]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[name]
        return next
      })
    }

    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = {}
    const nome = form.nome.trim()
    const email = form.email.trim()
    const senha = form.senha.trim()

    if (!nome) validationErrors.nome = 'Este campo é obrigatório.'
    if (!email) validationErrors.email = 'Este campo é obrigatório.'
    if (!senha) validationErrors.senha = 'Este campo é obrigatório.'
    if (form.senha !== form.confirmacao) validationErrors.confirmacao = 'As senhas não coincidem.'

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    setFieldErrors({})

    try {
      await apiRequest('/auth/cadastro/', {
        method: 'POST',
        body: {
          organizacao: form.organizacao,
          nome,
          email,
          senha,
        },
      })

      const tokensResponse = await apiRequest('/auth/login/', {
        method: 'POST',
        body: {
          organizacao: form.organizacao,
          email,
          senha,
        },
      })
      writeStoredJSON(STORAGE_KEYS.tokens, tokensResponse)

      const profileResponse = await apiRequest('/auth/eu/')

      onAuthSuccess(tokensResponse, profileResponse)
      setSuccess('Conta criada com sucesso! Redirecionando...')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const apiFields = err?.fields || {}

      if (Object.keys(apiFields).length > 0) {
        setFieldErrors(apiFields)
        setError('')
      } else {
        setFieldErrors({})
        setError(authenticationErrorMessage(
          err,
          'Não foi possível criar a conta. A API exige um campo que não está presente no formulário.',
        ))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel register-layout register-page">
      <div className="card auth-card">
        <div className="register-brand">
          <span className="landing-lotus" aria-hidden="true">✦</span>
          <span><strong>Espaço Acolher</strong><small>PSICOLOGIA</small></span>
        </div>
        <p className="eyebrow">Comece sua jornada</p>
        <h2>Crie sua conta</h2>
        <p className="register-intro">Preencha os dados para começar sua jornada.</p>
        <form onSubmit={handleSubmit} className="stack-form" noValidate>
          <label>
            Nome completo
            <input name="nome" value={form.nome} onChange={handleChange} placeholder="Como podemos chamar você?" required />
            {fieldErrors.nome ? <small className="field-error">{fieldErrors.nome}</small> : null}
          </label>
          <label>
            E-mail
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="seuemail@exemplo.com" required />
            {fieldErrors.email ? <small className="field-error">{fieldErrors.email}</small> : null}
          </label>
          <label>
            Senha
            <input type="password" name="senha" value={form.senha} onChange={handleChange} placeholder="Crie uma senha segura" required />
            {fieldErrors.senha ? <small className="field-error">{fieldErrors.senha}</small> : null}
          </label>
          <label>
            Confirmar senha
            <input type="password" name="confirmacao" value={form.confirmacao} onChange={handleChange} placeholder="Digite sua senha novamente" required />
            {fieldErrors.confirmacao ? <small className="field-error">{fieldErrors.confirmacao}</small> : null}
          </label>

          {fieldErrors.general ? <Alert type="danger" message={fieldErrors.general} /> : null}
          {success ? <Alert type="success" message={success} /> : null}
          {error ? <Alert type="danger" message={error} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p className="register-login-link">Já tem uma conta? <Link to="/login">Entrar</Link></p>
      </div>
      <aside className="register-aside" aria-label="Mensagem de acolhimento">
        <span className="auth-symbol" aria-hidden="true">✦</span>
        <p className="eyebrow">Um começo gentil</p>
        <h1>Um espaço para cuidar de você.</h1>
        <p>Crie sua conta para encontrar apoio, organizar seus momentos e acompanhar sua jornada com tranquilidade.</p>
        <span className="auth-aside-note">Cuidado, escuta e presença.</span>
      </aside>
    </section>
  )
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await apiRequest('/auth/redefinir-senha/', {
        method: 'POST',
        body: {
          organizacao: 'psicologia',
          email,
        },
      })

      setSuccess('Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.')
      setEmail('')
    } catch (err) {
      setError(authenticationErrorMessage(err, 'Não foi possível solicitar o link de recuperação.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel reset-page">
      <div className="card auth-card">
        <BackButton label="Voltar para login" to="/login" />
        <p className="eyebrow">Acesso</p>
        <h2>Esqueci minha senha</h2>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {error ? <Alert type="danger" message={error} /> : null}
          {success ? <Alert type="success" message={success} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate('/login')}>
            Voltar ao login
          </button>
        </form>
      </div>
    </section>
  )
}

function DashboardPage({ profile }) {
  const [organization, setOrganization] = useState(null)
  const [nextSession, setNextSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const today = new Date().toISOString().slice(0, 10)
      const [org, agenda] = await Promise.all([
        apiRequest('/organizacao/'),
        apiRequest(`/agendamentos/?data_inicio=${today}`),
      ])

      const appointments = Array.isArray(agenda?.results) ? agenda.results : Array.isArray(agenda) ? agenda : []
      const upcoming = appointments
        .filter((appointment) => !['cancelado', 'concluido'].includes(appointment.status))
        .filter((appointment) => !appointment.inicio || new Date(appointment.inicio) >= new Date())
        .sort((first, second) => new Date(first.inicio) - new Date(second.inicio))[0] || null
      setOrganization(org)
      setNextSession(upcoming)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  return (
    <section className="page-block profile-page">
      <PageHeader
        title="Painel do paciente"
        subtitle={profile?.nome ? `Bem-vindo(a), ${profile.nome}.` : 'Acompanhe seus atendimentos.'}
      >
        <Link to="/agendar" className="button-primary">
          Agendar nova sessão
        </Link>
      </PageHeader>

      {loading ? (
        <LoadingState message="Carregando painel do paciente" />
      ) : error ? (
        <>
          <Alert type="danger" message={error} />
          <button type="button" className="button-secondary" onClick={loadDashboard}>Tentar de novo</button>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard label="Negócio" value={organization?.nome || 'Não informado'} accent="primary" />
            <StatCard label="Próxima sessão" value={nextSession ? formatDate(nextSession.inicio) : 'Sem agendamento'} accent="secondary" />
            <StatCard label="Status" value={nextSession?.status ? formatStatus(nextSession.status) : 'Disponível'} accent="tertiary" />
          </div>

          <div className="card section-card">
            <h3>Próximo atendimento</h3>
            {nextSession ? (
              <div className="session-highlight">
                <div>
                  <strong>{nextSession.servico?.nome || nextSession.servico || 'Sessão'}</strong>
                  <p>{nextSession.recurso?.nome || nextSession.recurso || 'Psicólogo'} • {formatDate(nextSession.inicio)}</p>
                </div>
                <div className="meta-actions">
                  <span className="badge">{formatStatus(nextSession.status)}</span>
                  <Link to="/minhas-sessoes" className="button-secondary small-button">Ver agendamento</Link>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Você ainda não possui sessões agendadas"
                description="Acesse o agendamento para escolher profissional e horário."
                action={<Link to="/agendar" className="button-secondary">Agendar</Link>}
              />
            )}
          </div>
        </>
      )}
    </section>
  )
}

function AppointmentFlowPage() {
  const location = useLocation()
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [resources, setResources] = useState([])
  const [selectedResource, setSelectedResource] = useState(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [observacoes, setObservacoes] = useState('')
  const [submittedAppointment, setSubmittedAppointment] = useState(null)
  const [step, setStep] = useState(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const slotsRequestId = useRef(0)
  const preselectedResource = location.state?.resource || null

  const listResponse = (response) =>
    Array.isArray(response?.results)
      ? response.results
      : Array.isArray(response?.horarios)
        ? response.horarios
        : Array.isArray(response)
          ? response
          : []

  const loadServices = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiRequest('/servicos/')
      setServices(listResponse(response))
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleSelectService = (service) => {
    slotsRequestId.current += 1
    setSelectedService(service)
    setSelectedResource(preselectedResource)
    setResources([])
    setDate('')
    setSlots([])
    setSelectedSlot(null)
    setError('')
    setStep(3)
  }

  const loadResources = async () => {
    if (!selectedService) return
    try {
      setLoading(true)
      setError('')
      const response = await apiRequest(`/recursos/?servicos=${selectedService.id}`)
      setResources(listResponse(response))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step === 3) loadResources()
  }, [step, selectedService])

  const handleSelectResource = (resource) => {
    setSelectedResource(resource)
    setStep(4)
  }

  const loadSlots = async (selectedDate = date) => {
    if (!selectedService || !selectedDate) return
    const requestId = ++slotsRequestId.current

    try {
      setLoading(true)
      setError('')
      const result = await apiRequest(
        `/horarios-livres/?servico=${selectedService.id}&data=${selectedDate}${selectedResource?.id ? `&recurso=${selectedResource.id}` : ''}`,
      )
      if (requestId !== slotsRequestId.current) return
      setSlots(listResponse(result))
      setSelectedSlot(null)
    } catch (err) {
      if (requestId !== slotsRequestId.current) return
      setError(err.message)
    } finally {
      if (requestId === slotsRequestId.current) setLoading(false)
    }
  }

  const handleSelectDate = (value) => {
    setDate(value)
    setSlots([])
    setSelectedSlot(null)
    slotsRequestId.current += 1
    if (value) {
      loadSlots(value)
    }
  }

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot)
    setStep(5)
  }

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot?.inicio) {
      setError('Selecione um serviço e um horário disponível.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const payload = {
        servico: selectedService.id,
        ...(selectedResource?.id ? { recurso: selectedResource.id } : {}),
        inicio: selectedSlot.inicio,
        observacoes,
      }

      const response = await apiRequest('/agendamentos/', {
        method: 'POST',
        body: payload,
      })

      setSubmittedAppointment(response)
      setStep(6)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 6) {
    const appointment = submittedAppointment || {}
    return (
      <section className="page-block change-password-page">
        <PageHeader title="Agendamento enviado" subtitle="Sua solicitação foi registrada com sucesso." />
        <div className="card section-card">
          <h3>Agendamento solicitado</h3>
          <p>O agendamento aguarda a confirmação do administrador.</p>
          <div className="session-highlight">
            <div>
              <strong>{selectedService?.nome || appointment.servico?.nome || 'Serviço selecionado'}</strong>
              <p>{selectedResource?.nome || appointment.recurso?.nome || 'Qualquer um'} • {formatDate(appointment.inicio || selectedSlot?.inicio)}</p>
            </div>
            <span className="badge">{appointment.status === 'solicitado' ? 'Solicitada' : formatStatus(appointment.status)}</span>
          </div>
          <p className="muted">
            {selectedService?.duracao ? `${selectedService.duracao} min` : ''}
            {selectedService?.preco !== undefined ? ` • ${formatCurrency(selectedService.preco)}` : ''}
          </p>
          <div className="meta-actions">
            {appointment.id ? (
              <Link to={`/sessao/${appointment.id}`} className="button-secondary">Ver sessão</Link>
            ) : null}
            <Link to="/dashboard" className="button-primary">Início</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-block">
      <PageHeader
        title="Agendar sessão"
        subtitle="Escolha o serviço, os profissionais e o horário ideal."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />

      {error ? (
        <>
          <Alert type="danger" message={error} />
          <button type="button" className="button-secondary" onClick={step === 2 ? loadServices : step === 3 ? loadResources : loadSlots}>
            Tentar de novo
          </button>
        </>
      ) : null}
      {loading ? <LoadingState message="Carregando informações do agendamento" /> : null}

      {step === 2 && !loading ? (
        <div className="card section-card">
          <h3>Escolha o serviço</h3>
          {!loaded || services.length === 0 ? (
            <EmptyState title="Nenhum serviço disponível" description="Ainda não há serviços disponíveis para agendamento." />
          ) : (
            <div className="service-grid">
              {services.map((service) => (
                <button type="button" key={service.id} className="service-card" onClick={() => handleSelectService(service)}>
                  {service.imagem || service.imagem_url ? <img src={service.imagem || service.imagem_url} alt="" /> : null}
                  <strong>{service.nome}</strong>
                  {service.descricao ? <span>{service.descricao}</span> : null}
                  {service.duracao !== undefined ? <em>{service.duracao} min</em> : null}
                  {service.preco !== undefined ? <b>{formatCurrency(service.preco)}</b> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {step === 3 && !loading ? (
        <div className="card section-card">
          <button type="button" className="back-button" onClick={() => setStep(2)}><span aria-hidden="true">←</span> Voltar para serviços</button>
          <h3>Escolha o psicólogo</h3>
          <div className="staff-grid">
            {!preselectedResource ? <button type="button" className={`staff-card ${!selectedResource ? 'selected' : ''}`} onClick={() => handleSelectResource(null)}>
              <div className="staff-card-content"><h3>Qualquer um</h3><p>Escolha o primeiro profissional disponível.</p></div>
            </button> : null}
            {resources.filter((resource) => !preselectedResource || resource.id === preselectedResource.id).map((resource) => (
              <button type="button" key={resource.id} className={`staff-card ${selectedResource?.id === resource.id ? 'selected' : ''}`} onClick={() => handleSelectResource(resource)}>
                <div className="staff-card-content">
                  {resource.foto || resource.foto_url ? <img src={resource.foto || resource.foto_url} alt="" /> : null}
                  <h3>{resource.nome}</h3>
                  {resource.bio ? <p>{resource.bio}</p> : null}
                </div>
              </button>
            ))}
          </div>
          {resources.length === 0 ? <p className="muted">Nenhum psicólogo está vinculado a este serviço.</p> : null}
        </div>
      ) : null}

      {step === 4 && !loading ? (
        <div className="card section-card">
          <button type="button" className="back-button" onClick={() => setStep(3)}><span aria-hidden="true">←</span> Voltar para psicólogos</button>
          <h3>Escolha a data e o horário</h3>
          <label>Data<input type="date" value={date} onChange={(event) => handleSelectDate(event.target.value)} /></label>
          {date && slots.length === 0 ? <p className="muted">Não há horários disponíveis para esta data.</p> : null}
          {slots.length > 0 ? <div className="slot-grid">{slots.map((slot) => (
            <button type="button" key={slot.inicio || slot.id} className="slot-item" onClick={() => handleSelectSlot(slot)}>
              <span>{slot.recurso?.nome || slot.recurso || selectedResource?.nome || 'Qualquer psicólogo'}</span>
              <strong>{slot.inicio || slot.horario}</strong>
            </button>
          ))}</div> : null}
        </div>
      ) : null}

      {step === 5 && !loading ? (
        <div className="card section-card">
          <button type="button" className="back-button" onClick={() => setStep(4)}><span aria-hidden="true">←</span> Voltar para horários</button>
          <h3>Confirme seu agendamento</h3>
          <p><strong>Serviço:</strong> {selectedService?.nome}</p>
          <p><strong>Psicólogo:</strong> {selectedResource?.nome || 'Qualquer um'}</p>
          <p><strong>Data e horário:</strong> {formatDate(selectedSlot?.inicio)}</p>
          {selectedService?.duracao !== undefined ? <p><strong>Duração:</strong> {selectedService.duracao} min</p> : null}
          {selectedService?.preco !== undefined ? <p><strong>Preço:</strong> {formatCurrency(selectedService.preco)}</p> : null}
          <label>Observações<textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} /></label>
          {error ? <Alert type="danger" message={error} /> : null}
          <button type="button" className="button-primary" onClick={handleConfirm} disabled={loading}>Confirmar agendamento</button>
        </div>
      ) : null}
    </section>
  )
}

function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('upcoming')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyHasMore, setHistoryHasMore] = useState(false)

  const loadAppointments = async (nextTab = tab, page = 1, append = false) => {
    try {
      setLoading(true)
      setError('')
      const today = new Date()
      const endpoint = nextTab === 'upcoming'
        ? `/agendamentos/?data_inicio=${today.toISOString().slice(0, 10)}`
        : `/agendamentos/?data_fim=${new Date(today.setDate(today.getDate() - 1)).toISOString().slice(0, 10)}&ordering=-inicio&page=${page}`
      const response = await apiRequest(endpoint)
      const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
      setAppointments((current) => append ? [...current, ...list] : list)
      setHistoryHasMore(Boolean(response?.next))
      setHistoryPage(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAppointments([])
    loadAppointments(tab)
  }, [tab])

  const visibleAppointments = tab === 'upcoming'
    ? appointments.filter((item) => !['cancelado', 'concluido'].includes(item.status))
    : appointments

  return (
    <section className="page-block">
      <PageHeader
        title="Minhas sessões"
        subtitle="Acompanhe seus atendimentos e próximos passos."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />

      <div className="meta-actions">
        <button type="button" className={tab === 'upcoming' ? 'button-primary' : 'button-secondary'} onClick={() => setTab('upcoming')}>Próximos</button>
        <button type="button" className={tab === 'history' ? 'button-primary' : 'button-secondary'} onClick={() => setTab('history')}>Histórico</button>
      </div>
      {loading ? <LoadingState message="Carregando sessões" /> : null}
      {error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={() => loadAppointments(tab, historyPage)}>Tentar de novo</button></> : null}

      <div className="card section-card">
        {!loading && !error && visibleAppointments.length > 0 ? (
          <div className="list-stack">
            {visibleAppointments.map((item) => (
              <Link className="list-item" key={item.id} to={`/sessao/${item.id}`}>
                <div><strong>{item.servico?.nome || item.servico || 'Sessão'}</strong><p>{item.recurso?.nome || item.recurso || 'Psicólogo'} • {formatDate(item.inicio)}</p></div>
                <span className="badge">{formatStatus(item.status)}</span>
              </Link>
            ))}
            {tab === 'history' && historyHasMore ? <button type="button" className="button-secondary" onClick={() => loadAppointments('history', historyPage + 1, true)}>Carregar mais</button> : null}
          </div>
        ) : !loading && !error ? (
          <EmptyState
            title={tab === 'upcoming' ? 'Nenhuma sessão próxima' : 'Nenhuma sessão no histórico'}
            description="Não há sessões para exibir."
            action={<Link to="/agendar" className="button-primary">Agendar</Link>}
          />
        ) : null}
      </div>
    </section>
  )
}

function PsychologistsPage() {
  const [psychologists, setPsychologists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPsychologists = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await apiRequest('/recursos/')
        const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
        setPsychologists(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    loadPsychologists()
  }, [])

  return (
    <section className="page-block">
      <PageHeader
        title="Psicólogos"
        subtitle="Encontre um profissional para acompanhar sua jornada."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />

      {loading ? <LoadingState message="Carregando equipe" /> : null}
      {error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadPsychologists}>Tentar de novo</button></> : null}

      {!loading && !error && psychologists.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nenhum profissional disponível"
            description="Ainda não há profissionais cadastrados para apresentar."
          />
        </div>
      ) : null}

      {!loading && !error && psychologists.length > 0 ? (
        <div className="staff-grid">
          {psychologists.map((professional) => {
            const professionalProfile = {
              nome: professional.nome,
              foto: getProfessionalPhoto(professional),
            }
            const profession = professional.profissao || professional.cargo
            const specialty = professional.especialidade || professional.especialidades

            return (
              <article className="card staff-card" key={professional.id}>
                <ProfileAvatar profile={professionalProfile} size="professional" />
                <div className="staff-card-content">
                  <h3>{professional.nome || 'Profissional'}</h3>
                  {profession ? <span className="staff-profession">{profession}</span> : null}
                  {specialty ? <span className="staff-specialty">{specialty}</span> : null}
                  {professional.bio ? <p>{professional.bio}</p> : null}
                </div>
                <Link to={`/psicologo/${professional.id}`} className="button-primary staff-card-action">
                  Ver perfil
                </Link>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function AppointmentDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  const loadAppointment = async () => {
    try {
      setLoading(true)
      setError('')
      setAppointment(await apiRequest(`/agendamentos/${id}/`))
    } catch (err) {
      setError(err.status === 404 ? 'Não encontrado' : err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAppointment() }, [id])

  const permissions = readStoredJSON(STORAGE_KEYS.profile)?.permissoes
  const canReview = hasPermission(permissions, 'api.avaliar_agendamento')
  const canCancel = ['solicitado', 'confirmado'].includes(appointment?.status)

  const handleCancel = async () => {
    if (!window.confirm('Deseja cancelar esta sessão?')) return
    try {
      setCancelLoading(true)
      setActionMessage('')
      await apiRequest(`/agendamentos/${id}/cancelar/`, { method: 'POST' })
      setActionMessage('Sessão cancelada com sucesso.')
      await loadAppointment()
    } catch (err) {
      setActionMessage(err.message)
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) return <section className="page-block"><BackButton label="Voltar para sessões" to="/minhas-sessoes" /><LoadingState message="Carregando sessão" /></section>
  if (error) return <section className="page-block"><BackButton label="Voltar para sessões" to="/minhas-sessoes" /><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadAppointment}>Tentar de novo</button></section>

  const review = appointment.avaliacao || appointment.avaliacoes?.[0]
  const hasReview = appointment.nota !== undefined && appointment.nota !== null || Boolean(review)
  return (
    <section className="page-block">
      <PageHeader title="Detalhe da sessão" subtitle="Confira os dados do seu agendamento." backLabel="Voltar para sessões" backTo="/minhas-sessoes" />
      {location.state?.message ? <Alert type="success" message={location.state.message} /> : null}
      {actionMessage ? <Alert type={actionMessage.includes('sucesso') ? 'success' : 'danger'} message={actionMessage} /> : null}
      <div className="card section-card">
        <h3>{appointment.servico?.nome || appointment.servico || 'Sessão'}</h3>
        <p><strong>Psicólogo:</strong> {appointment.recurso?.nome || appointment.recurso || 'Não informado'}</p>
        <p><strong>Cliente:</strong> {appointment.cliente?.nome || appointment.cliente || 'Não informado'}</p>
        <p><strong>Data e horário:</strong> {formatDate(appointment.inicio)}</p>
        {appointment.duracao !== undefined ? <p><strong>Duração:</strong> {appointment.duracao} min</p> : null}
        {appointment.preco !== undefined ? <p><strong>Preço:</strong> {formatCurrency(appointment.preco)}</p> : null}
        {appointment.observacoes ? <p><strong>Observações:</strong> {appointment.observacoes}</p> : null}
        <p><strong>Status:</strong> {formatStatus(appointment.status)}</p>
        <div className="meta-actions">
          {canCancel ? <button type="button" className="button-secondary" onClick={handleCancel} disabled={cancelLoading}>{cancelLoading ? 'Cancelando...' : 'Cancelar'}</button> : null}
          {appointment.status === 'concluido' && !hasReview && canReview ? <Link to={`/sessao/${id}/avaliar`} className="button-primary">Avaliar</Link> : null}
        </div>
        {hasReview ? <div className="session-highlight"><strong>Avaliação: {appointment.nota ?? review?.nota}/5</strong><span>{appointment.comentario || review?.comentario || 'Sem comentário'}</span></div> : null}
      </div>
    </section>
  )
}

function ReviewAppointmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (rating < 1 || rating > 5) {
      setError('Selecione uma nota de 1 a 5.')
      return
    }
    try {
      setLoading(true)
      setError('')
      await apiRequest(`/agendamentos/${id}/avaliar/`, {
        method: 'POST',
        body: { nota: rating, comentario: comment },
      })
      navigate(`/sessao/${id}`, { replace: true, state: { message: 'Avaliação enviada com sucesso.' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-block">
      <PageHeader title="Avaliar sessão" subtitle="Compartilhe como foi seu atendimento." backLabel="Voltar para sessão" backTo={`/sessao/${id}`} />
      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Nota</legend>
            <div className="meta-actions">
              {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={rating === value ? 'button-primary' : 'button-secondary'} onClick={() => setRating(value)}>{value}</button>)}
            </div>
          </fieldset>
          <label>Comentário<textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label>
          {error ? <Alert type="danger" message={error} /> : null}
          <button type="submit" className="button-primary" disabled={loading}>{loading ? 'Enviando...' : 'Enviar avaliação'}</button>
        </form>
      </div>
    </section>
  )
}

function PsychologistDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [professional, setProfessional] = useState(null)
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewNext, setReviewNext] = useState(false)
  const [reviewPage, setReviewPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfessional = async () => {
    try {
      setLoading(true)
      setError('')
      const [resource, serviceResponse, reviewResponse] = await Promise.all([
        apiRequest(`/recursos/${id}/`),
        apiRequest('/servicos/'),
        apiRequest(`/avaliacoes/?recurso=${id}`),
      ])
      setProfessional(resource)
      const allServices = Array.isArray(serviceResponse?.results) ? serviceResponse.results : Array.isArray(serviceResponse) ? serviceResponse : []
          const directServices = Array.isArray(resource.servicos) ? resource.servicos : Array.isArray(resource.servicos_oferecidos) ? resource.servicos_oferecidos : []
          const resourceServiceIds = directServices.map((item) => item.id || item)
          setServices(directServices.length > 0 && typeof directServices[0] === 'object'
            ? directServices
            : allServices.filter((service) => resourceServiceIds.includes(service.id)))
      const list = Array.isArray(reviewResponse?.results) ? reviewResponse.results : Array.isArray(reviewResponse) ? reviewResponse : []
      setReviews(list)
      setReviewNext(Boolean(reviewResponse?.next))
    } catch (err) {
      setError(err.status === 404 ? 'Não encontrado' : err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfessional() }, [id])

  const loadMoreReviews = async () => {
    const nextPage = reviewPage + 1
    const response = await apiRequest(`/avaliacoes/?recurso=${id}&page=${nextPage}`)
    const list = Array.isArray(response?.results) ? response.results : []
    setReviews((current) => [...current, ...list])
    setReviewPage(nextPage)
    setReviewNext(Boolean(response?.next))
  }


  if (loading) {
    return (
      <section className="page-block">
        <BackButton label="Voltar para profissionais" to="/psicologos" />
        <LoadingState message="Carregando perfil do psicólogo" />
      </section>
    )
  }
  if (error) {
    return (
      <section className="page-block">
        <BackButton label="Voltar para profissionais" to="/psicologos" />
        <Alert type="danger" message={error} />
        <button type="button" className="button-secondary" onClick={loadProfessional}>Tentar de novo</button>
      </section>
    )
  }

  return (
    <section className="page-block">
      <BackButton label="Voltar para profissionais" to="/psicologos" />
      <div className="card section-card profile-card">
        <ProfileAvatar profile={professional} size="profile" />
        <div>
          <p className="eyebrow">Perfil</p>
          <h2>{professional?.nome}</h2>
          {professional?.bio ? <p>{professional.bio}</p> : null}
        </div>
      </div>
      <button type="button" className="button-primary" onClick={() => navigate('/agendar', { state: { resource: professional } })}>Agendar com este psicólogo</button>
      {services.length > 0 ? <div className="card section-card"><h3>Serviços</h3><div className="service-grid">{services.map((service) => <div className="service-card" key={service.id}><strong>{service.nome}</strong>{service.descricao ? <span>{service.descricao}</span> : null}</div>)}</div></div> : null}
      <div className="card section-card">
        <h3>Avaliações</h3>
        {reviews.length === 0 ? <p className="muted">Nenhuma avaliação disponível.</p> : <div className="list-stack">{reviews.map((review) => <div className="list-item" key={review.id}><div><strong>{review.nota}/5</strong><p>{review.comentario || 'Sem comentário'}</p></div></div>)}</div>}
        {reviewNext ? <button type="button" className="button-secondary" onClick={loadMoreReviews}>Carregar mais</button> : null}
      </div>
    </section>
  )
}

function ProfilePage({ profile, onLogout, onProfileChange }) {
  const location = useLocation()
  const [form, setForm] = useState({ nome: profile?.nome || '', email: profile?.email || '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const organizationName =
    profile?.organizacao?.nome ||
    profile?.organizacao_nome ||
    profile?.negocio?.nome ||
    'Psicologia'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    try {
      const response = await apiRequest('/auth/eu/', {
        method: 'PATCH',
        body: {
          nome: form.nome,
        },
      })
      onProfileChange(response)
      setForm((current) => ({ ...current, nome: response?.nome || current.nome }))
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
    }
  }

  return (
    <section className="page-block">
      <PageHeader
        title="Meu perfil"
        subtitle="Atualize seus dados e mantenha seu cadastro em dia."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />
      {location.state?.message ? <Alert type="success" message={location.state.message} /> : null}

      <div className="card section-card">
        <ProfilePhotoUpload profile={profile} onProfileChange={onProfileChange} />
      </div>

      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSave}>
          <label>
            Nome
            <input name="nome" value={form.nome} onChange={handleChange} />
            {fieldErrors.nome ? <small className="field-error">{fieldErrors.nome}</small> : null}
          </label>
          <label>
            E-mail
            <input name="email" type="email" value={form.email} onChange={handleChange} disabled />
          </label>

          <button type="submit" className="button-primary">
            Salvar alterações
          </button>
          {error ? <Alert type="danger" message={error} /> : null}
        </form>
      </div>

      <div className="card section-card">
        <p className="eyebrow">Conta</p>
        <p><strong>Organização:</strong> {organizationName}</p>
        <div className="meta-actions">
          <Link to="/alterar-senha" className="button-secondary">Alterar senha</Link>
          <button type="button" className="button-ghost" onClick={onLogout}>Sair</button>
        </div>
      </div>
    </section>
  )
}

function ChangePasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ senha_atual: '', nova_senha: '', confirmacao: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextFieldErrors = {}

    if (!form.senha_atual) nextFieldErrors.senha_atual = 'Informe sua senha atual.'
    if (!form.nova_senha) nextFieldErrors.nova_senha = 'Informe a nova senha.'
    if (form.nova_senha !== form.confirmacao) {
      nextFieldErrors.confirmacao = 'A confirmação deve ser igual à nova senha.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setLoading(true)
    setError('')
    setFieldErrors({})

    try {
      await apiRequest('/auth/alterar-senha/', {
        method: 'POST',
        body: {
          senha_atual: form.senha_atual,
          nova_senha: form.nova_senha,
        },
      })
      navigate('/perfil', { replace: true, state: { message: 'Senha alterada' } })
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-block">
      <PageHeader
        title="Alterar senha"
        subtitle="Atualize sua senha para manter sua conta segura."
        backLabel="Voltar para o perfil"
        backTo="/perfil"
      />
      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSubmit} noValidate>
          <label>
            Senha atual
            <input type="password" name="senha_atual" value={form.senha_atual} onChange={handleChange} />
            {fieldErrors.senha_atual ? <small className="field-error">{fieldErrors.senha_atual}</small> : null}
          </label>
          <label>
            Nova senha
            <input type="password" name="nova_senha" value={form.nova_senha} onChange={handleChange} />
            {fieldErrors.nova_senha ? <small className="field-error">{fieldErrors.nova_senha}</small> : null}
          </label>
          <label>
            Confirmação da nova senha
            <input type="password" name="confirmacao" value={form.confirmacao} onChange={handleChange} />
            {fieldErrors.confirmacao ? <small className="field-error">{fieldErrors.confirmacao}</small> : null}
          </label>
          {error ? <Alert type="danger" message={error} /> : null}
          <div className="meta-actions">
            <button type="submit" className="button-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" className="button-secondary" onClick={() => navigate('/perfil')} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalAgendamentos: 0,
    pendentes: 0,
    concluidos: 0,
    profissionais: 0,
    servicos: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true)
        const [agenda, resources, services] = await Promise.all([
          apiRequest('/agendamentos/?status=solicitado'),
          apiRequest('/recursos/'),
          apiRequest('/servicos/'),
        ])

        setStats({
          totalAgendamentos: Array.isArray(agenda?.results) ? agenda.results.length : 0,
          pendentes: Array.isArray(agenda?.results) ? agenda.results.length : 0,
          concluidos: 0,
          profissionais: Array.isArray(resources?.results) ? resources.results.length : Array.isArray(resources) ? resources.length : 0,
          servicos: Array.isArray(services?.results) ? services.results.length : Array.isArray(services) ? services.length : 0,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [])

  return (
    <section className="page-block">
      <PageHeader title="Administração" subtitle="Visão geral do consultório e das solicitações." />

      {loading ? <LoadingState message="Carregando visão geral" /> : null}
      {error ? <Alert type="danger" message={error} /> : null}

      <div className="stats-grid admin-grid">
        <StatCard label="Pendentes" value={stats.pendentes} accent="primary" />
        <StatCard label="Profissionais" value={stats.profissionais} accent="secondary" />
        <StatCard label="Serviços" value={stats.servicos} accent="tertiary" />
        <StatCard label="Concluídos" value={stats.concluidos} accent="primary" />
      </div>
    </section>
  )
}

function AdminAgendaPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [resourceId, setResourceId] = useState('')
  const [resources, setResources] = useState([])
  const [agenda, setAgenda] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    try {
      setLoading(true); setError('')
      const query = `/agendamentos/?data_inicio=${date}&data_fim=${date}${resourceId ? `&recurso=${resourceId}` : ''}`
      const [items, resourceList] = await Promise.all([fetchAllPages(query), apiRequest('/recursos/')])
      setAgenda(items); setResources(responseList(resourceList))
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [date, resourceId])
  return (
    <section className="page-block"><PageHeader title="Agenda do dia" subtitle="Acompanhe os atendimentos do consultório." backLabel="Voltar para administração" backTo="/admin" />
      <div className="date-row"><label>Dia<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Psicólogo<select value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">Todos</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.nome}</option>)}</select></label></div>
      {loading ? <LoadingState message="Consultando agenda" /> : null}{error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}
      {!loading && !error ? <div className="card section-card">{agenda.length ? <div className="list-stack">{agenda.map((item) => <Link to={`/admin/sessao/${item.id}`} className="list-item" key={item.id}><div><strong>{item.servico?.nome || item.servico || 'Sessão'}</strong><p>{item.recurso?.nome || item.recurso || 'Psicólogo'} • {item.cliente?.nome || item.cliente || 'Paciente'} • {formatDate(item.inicio)}</p><p>{item.observacoes || 'Sem observações.'}</p></div><span className="badge">{formatStatus(item.status)}</span></Link>)}</div> : <EmptyState title="Nenhum atendimento neste dia" description="A agenda não possui atendimentos para o filtro selecionado." />}</div> : null}
    </section>
  )
}

function AdminRequestsPage({ permissions }) {
  const [requests, setRequests] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [actionId, setActionId] = useState('')
  const load = async () => { try { setLoading(true); setError(''); setRequests(await fetchAllPages('/agendamentos/?status=solicitado')) } catch (err) { setError(err.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const action = async (id, endpoint) => { if (endpoint === 'cancelar' && !window.confirm('Cancelar este agendamento?')) return; try { setActionId(id); setError(''); await apiRequest(`/agendamentos/${id}/${endpoint}/`, { method: 'POST' }); await load() } catch (err) { setError(err.message) } finally { setActionId('') } }
  return <section className="page-block"><PageHeader title="Pedidos para confirmar" subtitle="Revise e responda às solicitações." backLabel="Voltar para administração" backTo="/admin" />{loading ? <LoadingState message="Carregando solicitações" /> : null}{error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}<div className="card section-card">{!loading && !error && requests.length === 0 ? <EmptyState title="Nenhum pedido para confirmar" description="A fila está vazia." /> : <div className="list-stack">{requests.map((item) => <div className="list-item" key={item.id}><div><strong>{item.cliente?.nome || item.cliente || 'Paciente'}</strong><p>{item.servico?.nome || item.servico || 'Sessão'} • {item.recurso?.nome || item.recurso || 'Psicólogo'} • {formatDate(item.inicio)}</p><p>{item.observacoes || 'Sem observações.'}</p></div><div className="meta-actions">{hasPermission(permissions, 'api.confirmar_agendamento') ? <button type="button" className="button-primary small-button" disabled={actionId === item.id} onClick={() => action(item.id, 'confirmar')}>Confirmar</button> : null}{hasPermission(permissions, 'api.cancelar_agendamento') ? <button type="button" className="button-secondary small-button" disabled={actionId === item.id} onClick={() => action(item.id, 'cancelar')}>Cancelar</button> : null}</div></div>)}</div>}</div></section>
}

function AdminAppointmentDetailPage({ permissions }) {
  const { id } = useParams(); const [item, setItem] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [actionId, setActionId] = useState(''); const load = async () => { try { setLoading(true); setError(''); setItem(await apiRequest(`/agendamentos/${id}/`)) } catch (err) { setError(err.status === 404 ? 'Não encontrado.' : err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [id])
  const action = async (endpoint) => { if (endpoint === 'cancelar' && !window.confirm('Cancelar este agendamento?')) return; try { setActionId(endpoint); setError(''); await apiRequest(`/agendamentos/${id}/${endpoint}/`, { method: 'POST' }); await load() } catch (err) { setError(err.message) } finally { setActionId('') } }
  if (loading) return <section className="page-block"><BackButton label="Voltar para agenda" to="/admin/agenda" /><LoadingState message="Carregando sessão" /></section>
  if (error) return <section className="page-block"><BackButton label="Voltar para agenda" to="/admin/agenda" /><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></section>
  return <section className="page-block"><PageHeader title="Detalhe da sessão" subtitle="Gerencie o agendamento conforme suas permissões." backLabel="Voltar para agenda" backTo="/admin/agenda" /><div className="card section-card"><p><strong>Paciente:</strong> {item.cliente?.nome || item.cliente || 'Não informado'}</p><p><strong>Serviço:</strong> {item.servico?.nome || item.servico || 'Não informado'}</p><p><strong>Psicólogo:</strong> {item.recurso?.nome || item.recurso || 'Não informado'}</p><p><strong>Data:</strong> {formatDate(item.inicio)}</p>{item.duracao !== undefined ? <p><strong>Duração:</strong> {item.duracao} min</p> : null}{item.preco !== undefined ? <p><strong>Preço:</strong> {formatCurrency(item.preco)}</p> : null}<p><strong>Observações:</strong> {item.observacoes || 'Nenhuma'}</p><p><strong>Status:</strong> {formatStatus(item.status)}</p><div className="meta-actions">{item.status === 'solicitado' && hasPermission(permissions, 'api.confirmar_agendamento') ? <button className="button-primary" disabled={actionId === 'confirmar'} onClick={() => action('confirmar')}>Confirmar</button> : null}{item.status === 'confirmado' && hasPermission(permissions, 'api.concluir_agendamento') ? <button className="button-primary" disabled={actionId === 'concluir'} onClick={() => action('concluir')}>Concluir</button> : null}{['solicitado', 'confirmado'].includes(item.status) && hasPermission(permissions, 'api.cancelar_agendamento') ? <button className="button-secondary" disabled={actionId === 'cancelar'} onClick={() => action('cancelar')}>Cancelar</button> : null}</div></div></section>
}

function AdminBusinessPage({ permissions }) {
  const [organization, setOrganization] = useState(null); const [form, setForm] = useState({ nome: '', descricao: '' }); const [logo, setLogo] = useState(null); const [removeLogo, setRemoveLogo] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')
  const canEdit = hasPermission(permissions, 'api.change_organizacao')
  const load = async () => { try { setLoading(true); setError(''); const response = await apiRequest('/organizacao/'); setOrganization(response); setForm({ nome: response?.nome || '', descricao: response?.descricao || '' }) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [])
  const submit = async (event) => { event.preventDefault(); try { setSaving(true); setError(''); const body = new FormData(); body.append('nome', form.nome); body.append('descricao', form.descricao); if (removeLogo) body.append('logo', ''); else if (logo) body.append('logo', logo); const response = await apiRequest('/organizacao/', { method: 'PATCH', body }); setOrganization(response); setLogo(null); setRemoveLogo(false); setSuccess('Dados do negócio atualizados com sucesso.') } catch (err) { setError(err.message) } finally { setSaving(false) } }
  return <section className="page-block"><PageHeader title="Dados do negócio" subtitle="Configure os dados da organização." backLabel="Voltar para administração" backTo="/admin" />{loading ? <LoadingState message="Carregando dados do negócio" /> : null}{error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}{success ? <Alert type="success" message={success} /> : null}<div className="card section-card"><form className="stack-form" onSubmit={submit}><label>Nome<input name="nome" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} disabled={!canEdit} /></label><label>Descrição<textarea name="descricao" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} disabled={!canEdit} /></label><label>Logo<input type="file" accept="image/*" onChange={(event) => { setLogo(event.target.files?.[0] || null); setRemoveLogo(false) }} disabled={!canEdit} /></label>{organization?.logo ? <><img className="admin-image-preview" src={organization.logo} alt="Logo da organização" /><button type="button" className="button-ghost small-button" onClick={() => { setLogo(null); setRemoveLogo(true) }} disabled={!canEdit}>Remover logo</button></> : null}{canEdit ? <button className="button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button> : null}</form></div></section>
}

function AdminResourcesPage({ permissions }) {
  const [active, setActive] = useState('true'); const [resources, setResources] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const canEdit = hasPermission(permissions, 'api.change_recurso') || hasPermission(permissions, 'api.add_recurso')
  const load = async () => { try { setLoading(true); setError(''); setResources(await fetchAllPages(`/recursos/?ativo=${active}`)) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [active])
  const toggle = async (resource) => { const isActive = resource.ativo !== false; const actionLabel = isActive ? 'desativar' : 'ativar'; if (!window.confirm(`Deseja ${actionLabel} este psicólogo?`)) return; try { await apiRequest(`/recursos/${resource.id}/`, { method: 'PATCH', body: { ativo: !isActive } }); await load() } catch (err) { setError(err.message) } }
  return <section className="page-block"><PageHeader title="Psicólogos" subtitle="Gerencie profissionais ativos e inativos." backLabel="Voltar para administração" backTo="/admin">{canEdit ? <Link to="/admin/psicologos/novo" className="button-primary">Novo psicólogo</Link> : null}</PageHeader><div className="meta-actions"><button className={active === 'true' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('true')}>Ativos</button><button className={active === 'false' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('false')}>Inativos</button></div>{loading ? <LoadingState message="Carregando psicólogos" /> : null}{error ? <><Alert type="danger" message={error} /><button className="button-secondary" onClick={load}>Tentar de novo</button></> : null}{!loading && !error && !resources.length ? <EmptyState title="Nenhum psicólogo encontrado" description="Não há profissionais para este filtro." /> : <div className="staff-grid">{resources.map((resource) => { const isActive = resource.ativo !== false; return <article className="card staff-card" key={resource.id}><ProfileAvatar profile={resource} size="professional" /><div className="staff-card-content"><h3>{resource.nome}</h3>{resource.bio ? <p>{resource.bio}</p> : null}{resource.capacidade !== undefined ? <span>Capacidade: {resource.capacidade}</span> : null}<span className="badge">{isActive ? 'Ativo' : 'Inativo'}</span></div>{canEdit ? <div className="meta-actions"><Link to={`/admin/psicologos/${resource.id}/editar`} className="button-primary small-button">Editar</Link><Link to={`/admin/psicologos/${resource.id}/horarios`} className="button-secondary small-button">Horários</Link><button className="button-ghost small-button" onClick={() => toggle(resource)}>{isActive ? 'Desativar' : 'Ativar'}</button></div> : null}</article> })}</div>}</section>
}

function AdminResourceFormPage({ permissions }) {
  const { id } = useParams(); const navigate = useNavigate(); const editing = Boolean(id); const [form, setForm] = useState({ nome: '', bio: '', capacidade: '', ativo: true }); const [photo, setPhoto] = useState(null); const [loading, setLoading] = useState(editing); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [fields, setFields] = useState({})
  const canEdit = hasPermission(permissions, editing ? 'api.change_recurso' : 'api.add_recurso')
  const load = async () => { if (!editing) return; try { const item = await apiRequest(`/recursos/${id}/`); setForm({ nome: item.nome || '', bio: item.bio || '', capacidade: item.capacidade ?? '', ativo: item.ativo !== false }) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [id])
  const submit = async (event) => { event.preventDefault(); try { setSaving(true); setError(''); setFields({}); const body = new FormData(); Object.entries(form).forEach(([key, value]) => body.append(key, value)); if (photo) body.append('foto', photo); await apiRequest(editing ? `/recursos/${id}/` : '/recursos/', { method: editing ? 'PATCH' : 'POST', body }); navigate('/admin/psicologos') } catch (err) { setError(err.message); setFields(err.fields || {}) } finally { setSaving(false) } }
  return <section className="page-block"><PageHeader title={editing ? 'Editar psicólogo' : 'Novo psicólogo'} subtitle="Preencha os dados do profissional." backLabel="Voltar para psicólogos" backTo="/admin/psicologos" />{loading ? <LoadingState message="Carregando psicólogo" /> : null}<div className="card section-card"><form className="stack-form" onSubmit={submit}><label>Nome<input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} disabled={!canEdit} />{fields.nome ? <small className="field-error">{fields.nome}</small> : null}</label><label>Bio<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} disabled={!canEdit} /></label><label>Capacidade<input type="number" value={form.capacidade} onChange={(event) => setForm({ ...form, capacidade: event.target.value })} disabled={!canEdit} /></label><label>Foto<input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} disabled={!canEdit} /></label><label><input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} disabled={!canEdit} /> Ativo</label>{error ? <Alert type="danger" message={error} /> : null}{canEdit ? <button className="button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button> : null}</form></div></section>
}

function AdminAvailabilityPage({ permissions }) {
  const { id } = useParams(); const [items, setItems] = useState([]); const [form, setForm] = useState({ weekday: '0', start: '', end: '' }); const [editing, setEditing] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const canEdit = hasPermission(permissions, 'api.add_disponibilidade') || hasPermission(permissions, 'api.change_disponibilidade')
  const load = async () => { try { setLoading(true); setError(''); setItems(await fetchAllPages(`/disponibilidades/?recurso=${id}`)) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [id])
  const submit = async (event) => { event.preventDefault(); if (!form.start || !form.end || form.start >= form.end) { setError('Informe um intervalo de horário válido.'); return } try { setError(''); await apiRequest(editing ? `/disponibilidades/${editing}/` : '/disponibilidades/', { method: editing ? 'PATCH' : 'POST', body: { ...form, recurso: id } }); setEditing(null); setForm({ weekday: '0', start: '', end: '' }); await load() } catch (err) { setError(err.message) } }
  const remove = async (item) => { if (!window.confirm('Excluir este horário?')) return; try { await apiRequest(`/disponibilidades/${item.id}/`, { method: 'DELETE' }); await load() } catch (err) { setError(err.message) } }
  return <section className="page-block"><PageHeader title="Horários do psicólogo" subtitle="Gerencie as disponibilidades." backLabel="Voltar para psicólogos" backTo="/admin/psicologos" />{error ? <Alert type="danger" message={error} /> : null}{loading ? <LoadingState message="Carregando horários" /> : null}<div className="card section-card"><form className="date-row" onSubmit={submit}><label>Dia<select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: event.target.value })}><option value="0">Domingo</option><option value="1">Segunda-feira</option><option value="2">Terça-feira</option><option value="3">Quarta-feira</option><option value="4">Quinta-feira</option><option value="5">Sexta-feira</option><option value="6">Sábado</option></select></label><label>Início<input type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label><label>Fim<input type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /></label>{canEdit ? <button className="button-primary">{editing ? 'Atualizar' : 'Adicionar'}</button> : null}</form><div className="list-stack">{items.map((item) => <div className="list-item" key={item.id}><span>{['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][item.weekday]} • {item.start}–{item.end}</span><div className="meta-actions">{canEdit ? <button className="button-secondary small-button" onClick={() => { setEditing(item.id); setForm({ weekday: String(item.weekday), start: item.start, end: item.end }) }}>Editar</button> : null}{hasPermission(permissions, 'api.delete_disponibilidade') ? <button className="button-ghost small-button" onClick={() => remove(item)}>Excluir</button> : null}</div></div>)}</div></div></section>
}

function AdminServicesPage({ permissions }) {
  const [active, setActive] = useState('true'); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const canEdit = hasPermission(permissions, 'api.change_servico') || hasPermission(permissions, 'api.add_servico')
  const load = async () => { try { setLoading(true); setError(''); setItems(await fetchAllPages(`/servicos/?ativo=${active}`)) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [active])
  return <section className="page-block"><PageHeader title="Serviços" subtitle="Gerencie os serviços oferecidos." backLabel="Voltar para administração" backTo="/admin">{canEdit ? <Link to="/admin/servicos/novo" className="button-primary">Novo serviço</Link> : null}</PageHeader><div className="meta-actions"><button className={active === 'true' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('true')}>Ativos</button><button className={active === 'false' ? 'button-primary' : 'button-secondary'} onClick={() => setActive('false')}>Inativos</button></div>{loading ? <LoadingState message="Carregando serviços" /> : null}{error ? <><Alert type="danger" message={error} /><button className="button-secondary" onClick={load}>Tentar de novo</button></> : null}<div className="service-grid">{!loading && !error && !items.length ? <EmptyState title="Nenhum serviço encontrado" description="Não há serviços para este filtro." /> : items.map((item) => <article className="card service-card" key={item.id}>{item.imagem ? <img src={item.imagem} alt="" /> : null}<strong>{item.nome}</strong>{item.descricao ? <span>{item.descricao}</span> : null}{item.duracao !== undefined ? <em>{item.duracao} min</em> : null}{item.preco !== undefined ? <b>{formatCurrency(item.preco)}</b> : null}<span className="badge">{item.ativo !== false ? 'Ativo' : 'Inativo'}</span>{canEdit ? <Link className="button-primary small-button" to={`/admin/servicos/${item.id}/editar`}>Editar</Link> : null}</article>)}</div></section>
}

function AdminServiceFormPage({ permissions }) {
  const { id } = useParams(); const navigate = useNavigate(); const editing = Boolean(id); const [resources, setResources] = useState([]); const [form, setForm] = useState({ nome: '', descricao: '', duracao: '', preco: '', ativo: true, recursos: [] }); const [image, setImage] = useState(null); const [loading, setLoading] = useState(editing); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const canEdit = hasPermission(permissions, editing ? 'api.change_servico' : 'api.add_servico')
  useEffect(() => { Promise.all([apiRequest('/recursos/'), editing ? apiRequest(`/servicos/${id}/`) : Promise.resolve(null)]).then(([resourceResponse, service]) => { setResources(responseList(resourceResponse)); if (service) setForm({ nome: service.nome || '', descricao: service.descricao || '', duracao: service.duracao || '', preco: service.preco || '', ativo: service.ativo !== false, recursos: (service.recursos || service.recursos_ids || []).map((resource) => resource.id || resource) }) }).catch((err) => setError(err.message)).finally(() => setLoading(false)) }, [id])
  const submit = async (event) => { event.preventDefault(); try { setSaving(true); const body = new FormData(); Object.entries(form).forEach(([key, value]) => body.append(key, Array.isArray(value) ? JSON.stringify(value) : value)); if (image) body.append('imagem', image); await apiRequest(editing ? `/servicos/${id}/` : '/servicos/', { method: editing ? 'PATCH' : 'POST', body }); navigate('/admin/servicos') } catch (err) { setError(err.message) } finally { setSaving(false) } }
  return <section className="page-block"><PageHeader title={editing ? 'Editar serviço' : 'Novo serviço'} subtitle="Configure os dados do serviço." backLabel="Voltar para serviços" backTo="/admin/servicos" />{loading ? <LoadingState message="Carregando serviço" /> : null}<div className="card section-card"><form className="stack-form" onSubmit={submit}><label>Nome<input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} disabled={!canEdit} /></label><label>Descrição<textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} disabled={!canEdit} /></label><label>Duração<input type="number" value={form.duracao} onChange={(event) => setForm({ ...form, duracao: event.target.value })} disabled={!canEdit} /></label><label>Preço<input type="number" step="0.01" value={form.preco} onChange={(event) => setForm({ ...form, preco: event.target.value })} disabled={!canEdit} /></label><label>Imagem<input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} disabled={!canEdit} /></label><label><input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} disabled={!canEdit} /> Ativo</label><fieldset><legend>Psicólogos</legend>{resources.map((resource) => <label key={resource.id}><input type="checkbox" checked={form.recursos.includes(resource.id)} onChange={(event) => setForm({ ...form, recursos: event.target.checked ? [...form.recursos, resource.id] : form.recursos.filter((value) => value !== resource.id) })} /> {resource.nome}</label>)}</fieldset>{error ? <Alert type="danger" message={error} /> : null}{canEdit ? <button className="button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button> : null}</form></div></section>
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]); const [resources, setResources] = useState([]); const [resourceId, setResourceId] = useState(''); const [rating, setRating] = useState(''); const [next, setNext] = useState(false); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = async (append = false) => { try { setLoading(true); setError(''); const query = `/avaliacoes/?${resourceId ? `recurso=${resourceId}&` : ''}${rating ? `nota=${rating}&` : ''}page=${append ? page + 1 : 1}`; const [response, resourceResponse] = await Promise.all([apiRequest(query), resources.length ? Promise.resolve(resources) : apiRequest('/recursos/')]); const list = responseList(response); setReviews((current) => append ? [...current, ...list] : list); setNext(Boolean(response?.next)); setPage(append ? page + 1 : 1); if (!resources.length) setResources(responseList(resourceResponse)) } catch (err) { setError(err.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [resourceId, rating])
  return <section className="page-block"><PageHeader title="Avaliações" subtitle="Acompanhe a satisfação dos pacientes." backLabel="Voltar para administração" backTo="/admin" /><div className="date-row"><label>Psicólogo<select value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">Todos</option>{resources.map((resource) => <option value={resource.id} key={resource.id}>{resource.nome}</option>)}</select></label><label>Nota<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">Todas</option>{[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value}</option>)}</select></label></div>{loading ? <LoadingState message="Carregando avaliações" /> : null}{error ? <><Alert type="danger" message={error} /><button className="button-secondary" onClick={() => load()}>Tentar de novo</button></> : null}<div className="card section-card">{!loading && !error && !reviews.length ? <EmptyState title="Ainda sem avaliações" description="Nenhuma avaliação corresponde aos filtros." /> : <div className="list-stack">{reviews.map((item) => <div className="list-item" key={item.id}><div><strong>{item.nota}/5 • {item.recurso?.nome || item.recurso || 'Profissional'}</strong><p>{item.comentario || 'Sem comentário.'}</p></div></div>)}{next ? <button className="button-secondary" onClick={() => load(true)}>Carregar mais</button> : null}</div>}</div></section>
}

export default App
