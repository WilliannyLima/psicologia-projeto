const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://agendamentos.spaincentral.cloudapp.azure.com/api'
export const STORAGE_KEYS = { tokens: 'psicologia_tokens', profile: 'psicologia_profile' }
let tokenRefreshPromise = null

export function hasPermission(permissions, permission) { return Array.isArray(permissions) && permissions.includes(permission) }

export function authenticationErrorMessage(error, fallback) { if (error?.status === 400) return fallback; if (error?.status === 429) return 'Muitas tentativas, aguarde um minuto.'; if (error?.status === 403) return 'Você não tem permissão para esta ação.'; return error?.message || fallback }

export function readStoredJSON(key) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function writeStoredJSON(key, value) {
  if (!value) {
    localStorage.removeItem(key)
    return
  }
  localStorage.setItem(key, JSON.stringify(value))
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEYS.tokens)
  localStorage.removeItem(STORAGE_KEYS.profile)
}

export function normalizeErrorMessage(payload) {
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

export function responseList(response) {
  return Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []
}

export async function fetchAllPages(path, { strict = false } = {}) {
  const items = []
  let nextPath = path
  const apiBase = new URL(`${API_BASE_URL.replace(/\/+$/, '')}/`)
  const apiPrefix = apiBase.pathname.replace(/\/+$/, '')

  while (nextPath) {
    const response = await apiRequest(nextPath)
    if (strict && !Array.isArray(response) && !Array.isArray(response?.results)) {
      throw new Error('A API retornou uma resposta de lista inválida.')
    }
    items.push(...responseList(response))
    if (!response?.next) break
    const nextUrl = new URL(response.next, apiBase)
    if (nextUrl.origin !== apiBase.origin || !nextUrl.pathname.startsWith(`${apiPrefix}/`)) {
      throw new Error('A paginação da API apontou para um endereço inesperado.')
    }
    nextPath = `${nextUrl.pathname.slice(apiPrefix.length)}${nextUrl.search}`
  }

  return items
}

export function extractFieldErrors(payload) {
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

  if (payload.non_field_errors) {
    const value = payload.non_field_errors
    fieldErrors.general = Array.isArray(value) ? value.join(' ') : String(value)
  }

  return fieldErrors
}

export async function apiRequest(path, options = {}) {
  const { _retried = false, _skipAuth = false, _retryCount = 0, ...fetchOptions } = options
  const method = (fetchOptions.method || 'GET').toUpperCase()
  const canRetry = method === 'GET' || method === 'HEAD'
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

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, requestInit)
  } catch {
    if (canRetry && _retryCount < 2) {
      return apiRequest(path, { ...fetchOptions, _retried, _skipAuth, _retryCount: _retryCount + 1 })
    }
    throw new Error('Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.')
  }

  if (canRetry && response.status >= 500 && _retryCount < 2) {
    return apiRequest(path, { ...fetchOptions, _retried, _skipAuth, _retryCount: _retryCount + 1 })
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null)

  const isPublicAuthRequest = ['/auth/login/', '/auth/cadastro/', '/auth/redefinir-senha/'].includes(path)
  if (response.status === 401 && token && !_retried && path !== '/auth/renovar/' && !isPublicAuthRequest) {
    const refresh = storedTokens?.refresh

    if (refresh) {
      try {
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = apiRequest('/auth/renovar/', {
            method: 'POST',
            body: { refresh },
            _retried: true,
            _skipAuth: true,
          }).then((renewal) => {
            const nextTokens = { ...storedTokens, ...renewal }
            writeStoredJSON(STORAGE_KEYS.tokens, nextTokens)
            return nextTokens
          }).finally(() => {
            tokenRefreshPromise = null
          })
        }
        await tokenRefreshPromise
        return apiRequest(path, { ...fetchOptions, _retried: true })
      } catch (refreshError) {
        clearStoredAuth()
        tokenRefreshPromise = null
        window.location.assign('/login')
        throw new Error('Sua sessão expirou. Entre novamente.', { cause: refreshError })
      }
    } else {
      clearStoredAuth()
      window.location.assign('/login')
      throw new Error('Sua sessão expirou. Entre novamente.')
    }
  }

  if (!response.ok) {
    const error = new Error(normalizeErrorMessage(payload))
    error.status = response.status
    error.fields = extractFieldErrors(payload)
    if (response.status === 404) error.message = 'Não encontrado.'
    if (response.status === 403) error.message = 'Você não tem permissão para esta ação.'
    if (response.status === 429) error.message = 'Muitas tentativas, aguarde um minuto.'
    if (response.status >= 500) error.message = 'O serviço está temporariamente indisponível. Tente novamente.'
    throw error
  }

  return payload
}

export function requireProfileResponse(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response) || typeof response.nome !== 'string' || !response.nome.trim()) {
    throw new Error('A API retornou dados de perfil inválidos.')
  }

  return response
}
