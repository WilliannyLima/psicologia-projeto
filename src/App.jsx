import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
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
  const token = readStoredJSON(STORAGE_KEYS.tokens)?.access
  const headers = { ...(options.headers || {}) }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const requestInit = {
    ...options,
    headers,
  }

  if (options.body !== undefined) {
    requestInit.body =
      options.body instanceof FormData ? options.body : JSON.stringify(options.body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, requestInit)

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null)

  if (!response.ok) {
    const error = new Error(normalizeErrorMessage(payload))
    error.fields = extractFieldErrors(payload)
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

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
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

  useEffect(() => {
    writeStoredJSON(STORAGE_KEYS.tokens, tokens)
  }, [tokens])

  useEffect(() => {
    writeStoredJSON(STORAGE_KEYS.profile, profile)
  }, [profile])

  useEffect(() => {
    if (!tokens?.access) return

    const loadProfile = async () => {
      try {
        const response = await apiRequest('/auth/eu/')
        setProfile(response)
      } catch {
        setTokens(null)
        setProfile(null)
      }
    }

    loadProfile()
  }, [tokens?.access])

  const handleAuthSuccess = (nextTokens, nextProfile) => {
    setTokens(nextTokens)
    setProfile(nextProfile)
  }

  const logout = () => {
    setTokens(null)
    setProfile(null)
    setFlash({ type: 'info', message: 'Sessão encerrada com sucesso.' })
  }

  const canAdmin = Boolean(
    profile?.permissoes?.includes('api.change_organizacao') ||
      profile?.permissoes?.includes('change_organizacao'),
  )

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-wrap">
            <Link to="/" className="brand">
              <span className="brand-mark">P</span>
              <span>Psicologia</span>
            </Link>
          </div>

          <nav className="main-nav" aria-label="Navegação principal">
            {!tokens ? (
              <>
                <NavLink to="/">Início</NavLink>
                <NavLink to="/login">Entrar</NavLink>
                <NavLink to="/cadastro">Criar conta</NavLink>
              </>
            ) : (
              <>
                <NavLink to={canAdmin ? '/admin' : '/dashboard'}>Início</NavLink>
                {!canAdmin ? (
                  <>
                    <NavLink to="/agendar">Agendar</NavLink>
                    <NavLink to="/minhas-sessoes">Minhas sessões</NavLink>
                    <NavLink to="/psicologos">Psicólogos</NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/admin/agenda">Agenda</NavLink>
                    <NavLink to="/admin/solicitacoes">A confirmar</NavLink>
                    <NavLink to="/admin/organizacao">Negócio</NavLink>
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
                  <AdminAgendaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/solicitacoes"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/organizacao"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminBusinessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/avaliacoes"
              element={
                <ProtectedRoute isAuthenticated={Boolean(tokens) && canAdmin}>
                  <AdminReviewsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function LandingPage() {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">Consultório de Psicologia</p>
        <h1>Mais organização para a sua prática terapêutica.</h1>
        <p>
          Acompanhe pacientes, gerencie agendas, organize atendimentos e mantenha um atendimento
          acolhedor com uma interface clara e profissional.
        </p>
        <div className="cta-row">
          <Link to="/login" className="button-primary">
            Entrar
          </Link>
          <Link to="/cadastro" className="button-secondary">
            Criar conta
          </Link>
        </div>
      </div>

      <div className="hero-card">
        <div className="mini-stat">
          <span>Pacientes</span>
          <strong>+ gestão</strong>
        </div>
        <div className="mini-stat">
          <span>Agenda</span>
          <strong>Organizada</strong>
        </div>
        <div className="mini-stat">
          <span>Atendimentos</span>
          <strong>Mais clareza</strong>
        </div>
      </div>
    </section>
  )
}

function LoginPage({ onAuthSuccess }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ organizacao: 'psicologia', email: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      const profileResponse = await apiRequest('/auth/eu/', {
        headers: { Authorization: `Bearer ${loginResponse.access}` },
      })

      onAuthSuccess(loginResponse, profileResponse)
      navigate(profileResponse.permissoes?.includes('api.change_organizacao') ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel">
      <div className="card auth-card">
        <p className="eyebrow">Área do cliente</p>
        <h2>Entrar</h2>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            Organização
            <input name="organizacao" value={form.organizacao} onChange={handleChange} readOnly />
          </label>
          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              required
            />
          </label>

          {error ? <Alert type="danger" message={error} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/cadastro">Criar conta</Link>
          <Link to="/esqueci-minha-senha">Esqueci minha senha</Link>
        </div>
      </div>
    </section>
  )
}

function RegisterPage({ onAuthSuccess }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ organizacao: 'psicologia', nome: '', email: '', senha: '' })
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

      const profileResponse = await apiRequest('/auth/eu/', {
        headers: { Authorization: `Bearer ${tokensResponse.access}` },
      })

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
        setError(err.message || 'Não foi possível criar a conta. A API exige um campo que não está presente no formulário.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel">
      <div className="card auth-card">
        <p className="eyebrow">Cadastro</p>
        <h2>Criar conta</h2>
        <form onSubmit={handleSubmit} className="stack-form" noValidate>
          <label>
            Nome
            <input name="nome" value={form.nome} onChange={handleChange} required />
            {fieldErrors.nome ? <small className="field-error">{fieldErrors.nome}</small> : null}
          </label>
          <label>
            E-mail
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
            {fieldErrors.email ? <small className="field-error">{fieldErrors.email}</small> : null}
          </label>
          <label>
            Senha
            <input type="password" name="senha" value={form.senha} onChange={handleChange} required />
            {fieldErrors.senha ? <small className="field-error">{fieldErrors.senha}</small> : null}
          </label>

          {fieldErrors.general ? <Alert type="danger" message={fieldErrors.general} /> : null}
          {success ? <Alert type="success" message={success} /> : null}
          {error ? <Alert type="danger" message={error} /> : null}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
      </div>
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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-panel">
      <div className="card auth-card">
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

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        const [org, agenda] = await Promise.all([
          apiRequest('/organizacao/'),
          apiRequest(`/agendamentos/?data_inicio=${new Date().toISOString().slice(0, 10)}`),
        ])

        setOrganization(org)
        const upcoming = Array.isArray(agenda?.results) ? agenda.results[0] : null
        setNextSession(upcoming)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  return (
    <section className="page-block">
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
        <Alert type="danger" message={error} />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard label="Negócio" value={organization?.nome || 'Psicologia'} accent="primary" />
            <StatCard label="Próxima sessão" value={nextSession ? formatDate(nextSession.inicio) : 'Sem agendamento'} accent="secondary" />
            <StatCard label="Status" value={nextSession?.status ? formatStatus(nextSession.status) : 'Disponível'} accent="tertiary" />
          </div>

          <div className="card section-card">
            <h3>Próximo atendimento</h3>
            {nextSession ? (
              <div className="session-highlight">
                <div>
                  <strong>{nextSession.servico || 'Sessão'}</strong>
                  <p>{nextSession.recurso || 'Psicólogo'} • {formatDate(nextSession.inicio)}</p>
                </div>
                <span className="badge">{formatStatus(nextSession.status)}</span>
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
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedResource, setSelectedResource] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotSelected, setSlotSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true)
        const response = await apiRequest('/servicos/')
        setServices(Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadServices()
  }, [])

  const handleSelectService = async (service) => {
    setSelectedService(service)
    setSelectedResource('')
    setDate('')
    setSlots([])
    setSlotSelected('')

    try {
      setLoading(true)
      const professionals = await apiRequest(`/recursos/?servicos=${service.id}`)
      setSelectedResource(professionals?.results?.[0]?.id || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSlots = async () => {
    if (!selectedService || !date) return

    try {
      setLoading(true)
      const result = await apiRequest(
        `/horarios-livres/?servico=${selectedService.id}&data=${date}${selectedResource ? `&recurso=${selectedResource}` : ''}`,
      )
      setSlots(Array.isArray(result?.results) ? result.results : Array.isArray(result) ? result : [])
      setSlotSelected('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedService || !slotSelected) {
      setError('Selecione um serviço e um horário disponível.')
      return
    }

    try {
      setLoading(true)
      const payload = {
        servico: selectedService.id,
        recurso: selectedResource || null,
        inicio: slotSelected,
        observacoes: 'Solicitação de agendamento pela interface web.',
      }

      await apiRequest('/agendamentos/', {
        method: 'POST',
        body: payload,
      })

      setError('')
      setSelectedService(null)
      setSelectedResource('')
      setDate('')
      setSlots([])
      setSlotSelected('')
      window.alert('Agendamento enviado com sucesso!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-block">
      <PageHeader title="Agendar sessão" subtitle="Escolha o serviço, os profissionais e o horário ideal." />

      {loading ? <LoadingState message="Consultando horários e serviços" /> : null}
      {error ? <Alert type="danger" message={error} /> : null}

      <div className="card section-card">
        <h3>1. Escolha o serviço</h3>
        <div className="service-grid">
          {services.map((service) => (
            <button
              type="button"
              key={service.id}
              className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
              onClick={() => handleSelectService(service)}
            >
              <strong>{service.nome}</strong>
              <span>{service.descricao || 'Sessão individual'} </span>
              <em>{service.duracao || '50'} min</em>
              <b>{formatCurrency(service.preco || 0)}</b>
            </button>
          ))}
        </div>
      </div>

      {selectedService ? (
        <div className="card section-card">
          <h3>2. Escolha o dia e o horário</h3>
          <div className="date-row">
            <label>
              Data
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <button type="button" className="button-secondary" onClick={handleLoadSlots}>
              Consultar horários
            </button>
          </div>

          {slots.length > 0 ? (
            <div className="slot-grid">
              {slots.map((slot) => (
                <button
                  type="button"
                  key={slot.inicio || slot.id}
                  className={`slot-item ${slotSelected === slot.inicio ? 'selected' : ''}`}
                  onClick={() => setSlotSelected(slot.inicio || slot.id)}
                >
                  {slot.recurso || 'Qualquer psicólogo'}
                  <strong>{slot.inicio || slot.horario}</strong>
                </button>
              ))}
            </div>
          ) : (
            date && <p className="muted">Sem horários livres neste dia.</p>
          )}

          {slotSelected ? (
            <div className="confirm-bar">
              <span>Horário escolhido: {slotSelected}</span>
              <button type="button" className="button-primary" onClick={handleConfirm}>
                Confirmar agendamento
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true)
        const response = await apiRequest(`/agendamentos/?data_inicio=${new Date().toISOString().slice(0, 10)}`)
        const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
        setAppointments(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [])

  return (
    <section className="page-block">
      <PageHeader title="Minhas sessões" subtitle="Acompanhe seus atendimentos e próximos passos." />

      {loading ? <LoadingState message="Carregando sessões" /> : null}
      {error ? <Alert type="danger" message={error} /> : null}

      <div className="card section-card">
        {appointments.length > 0 ? (
          <div className="list-stack">
            {appointments.map((item) => (
              <div className="list-item" key={item.id}>
                <div>
                  <strong>{item.servico || 'Sessão'}</strong>
                  <p>{item.recurso || 'Psicólogo'} • {formatDate(item.inicio)}</p>
                </div>
                <div className="meta-actions">
                  <span className="badge">{formatStatus(item.status)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma sessão por enquanto"
            description="Você ainda não possui atendimentos agendados."
            action={<Link to="/agendar" className="button-primary">Agendar</Link>}
          />
        )}
      </div>
    </section>
  )
}

function PsychologistsPage() {
  const [psychologists, setPsychologists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPsychologists = async () => {
      try {
        setLoading(true)
        const response = await apiRequest('/recursos/')
        const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
        setPsychologists(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadPsychologists()
  }, [])

  return (
    <section className="page-block">
      <PageHeader title="Psicólogos" subtitle="Conheça a equipe e os profissionais disponíveis." />

      {loading ? <LoadingState message="Carregando equipe" /> : null}
      {error ? <Alert type="danger" message={error} /> : null}

      <div className="staff-grid">
        {psychologists.map((professional) => (
          <div className="card staff-card" key={professional.id}>
            <div className="avatar-placeholder">{professional.nome?.charAt(0) || 'P'}</div>
            <h3>{professional.nome}</h3>
            <p>{professional.bio || 'Especialista em atendimento acolhedor.'}</p>
            <Link to={`/psicologo/${professional.id}`} className="button-secondary">
              Ver perfil
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function PsychologistDetailPage() {
  const { id } = useParams()
  const [professional, setProfessional] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProfessional = async () => {
      try {
        setLoading(true)
        const response = await apiRequest(`/recursos/${id}/`)
        setProfessional(response)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProfessional()
  }, [id])

  if (loading) return <LoadingState message="Carregando perfil do psicólogo" />
  if (error) return <Alert type="danger" message={error} />

  return (
    <section className="page-block">
      <div className="card section-card profile-card">
        <div className="avatar-placeholder large">{professional?.nome?.charAt(0) || 'P'}</div>
        <div>
          <p className="eyebrow">Perfil</p>
          <h2>{professional?.nome}</h2>
          <p>{professional?.bio || 'Atendimento individualizado e humanizado.'}</p>
        </div>
      </div>
    </section>
  )
}

function ProfilePage({ profile, onProfileChange }) {
  const [form, setForm] = useState({ nome: profile?.nome || '', email: profile?.email || '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()

    try {
      const response = await apiRequest('/auth/eu/', {
        method: 'PATCH',
        body: {
          nome: form.nome,
        },
      })
      onProfileChange(response)
      window.alert('Perfil atualizado com sucesso!')
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <section className="page-block">
      <PageHeader title="Meu perfil" subtitle="Atualize seus dados e mantenha seu cadastro em dia." />

      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSave}>
          <label>
            Nome
            <input name="nome" value={form.nome} onChange={handleChange} />
          </label>
          <label>
            E-mail
            <input name="email" type="email" value={form.email} onChange={handleChange} disabled />
          </label>

          <button type="submit" className="button-primary">
            Salvar alterações
          </button>
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
  const [agenda, setAgenda] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadAgenda = async () => {
      try {
        setLoading(true)
        const response = await apiRequest(`/agendamentos/?data_inicio=${new Date().toISOString().slice(0, 10)}&data_fim=${new Date().toISOString().slice(0, 10)}`)
        const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
        setAgenda(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAgenda()
  }, [])

  return (
    <section className="page-block">
      <PageHeader title="Agenda do dia" subtitle="Agenda e acompanhamento dos atendimentos do dia." />

      {loading ? <LoadingState message="Consultando agenda" /> : null}
      {error ? <Alert type="danger" message={error} /> : null}

      <div className="card section-card">
        {agenda.length > 0 ? (
          <div className="list-stack">
            {agenda.map((item) => (
              <div key={item.id} className="list-item agenda-item">
                <div>
                  <strong>{item.servico || 'Sessão'}</strong>
                  <p>{item.recurso || 'Profissional'} • {formatDate(item.inicio)}</p>
                </div>
                <span className="badge">{formatStatus(item.status)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma sessão neste dia" description="Ainda não há atendimentos agendados para o dia selecionado." />
        )}
      </div>
    </section>
  )
}

function AdminRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true)
        const response = await apiRequest('/agendamentos/?status=solicitado')
        const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
        setRequests(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  return (
    <section className="page-block">
      <PageHeader title="Pedidos para confirmar" subtitle="Revise e responda às solicitações recebidas." />

      {loading ? <LoadingState message="Carregando solicitações" /> : null}
      {error ? <Alert type="danger" message={error} /> : null}

      <div className="card section-card">
        {requests.length > 0 ? (
          <div className="list-stack">
            {requests.map((item) => (
              <div key={item.id} className="list-item">
                <div>
                  <strong>{item.servico || 'Sessão'}</strong>
                  <p>{item.recurso || 'Profissional'} • {formatDate(item.inicio)}</p>
                </div>
                <div className="meta-actions">
                  <button type="button" className="button-primary small-button">
                    Confirmar
                  </button>
                  <button type="button" className="button-secondary small-button">
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum pedido para confirmar" description="A fila de solicitações está vazia no momento." />
        )}
      </div>
    </section>
  )
}

function AdminBusinessPage() {
  const [form, setForm] = useState({ nome: 'Psicologia', descricao: 'Consultório de psicologia com foco em acolhimento e bem-estar.' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const response = await apiRequest('/organizacao/')
        if (response) {
          setForm({
            nome: response.nome || 'Psicologia',
            descricao: response.descricao || 'Consultório de psicologia.',
          })
        }
      } catch (err) {
        window.alert(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadBusiness()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      await apiRequest('/organizacao/', {
        method: 'PATCH',
        body: form,
      })
      window.alert('Dados do negócio atualizados com sucesso!')
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <section className="page-block">
      <PageHeader title="Dados do negócio" subtitle="Configure a identidade e a descrição do consultório." />

      {loading ? <LoadingState message="Carregando dados do negócio" /> : null}

      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Nome da organização
            <input name="nome" value={form.nome} onChange={handleChange} />
          </label>
          <label>
            Descrição
            <textarea name="descricao" value={form.descricao} onChange={handleChange} rows="5" />
          </label>
          <button type="submit" className="button-primary">
            Salvar alterações
          </button>
        </form>
      </div>
    </section>
  )
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true)
        const response = await apiRequest('/avaliacoes/')
        const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
        setReviews(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadReviews()
  }, [])

  return (
    <section className="page-block">
      <PageHeader title="Avaliações" subtitle="Acompanhe a satisfação dos pacientes." />

      {loading ? <LoadingState message="Carregando avaliações" /> : null}
      {error ? <Alert type="danger" message={error} /> : null}

      <div className="card section-card">
        {reviews.length > 0 ? (
          <div className="list-stack">
            {reviews.map((item) => (
              <div key={item.id} className="list-item">
                <div>
                  <strong>{item.nota || 'Nota'} / 5</strong>
                  <p>{item.comentario || 'Sem comentário registrado.'}</p>
                </div>
                <span className="badge">{item.recurso || 'Profissional'}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Ainda sem avaliações" description="Os comentários dos pacientes aparecerão aqui assim que forem enviados." />
        )}
      </div>
    </section>
  )
}

export default App
