import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, clearStoredAuth, readStoredJSON, STORAGE_KEYS, writeStoredJSON } from './api/client.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => readStoredJSON(STORAGE_KEYS.tokens))
  const [profile, setProfile] = useState(() => readStoredJSON(STORAGE_KEYS.profile))
  const [loading, setLoading] = useState(() => Boolean(readStoredJSON(STORAGE_KEYS.tokens)?.access && !readStoredJSON(STORAGE_KEYS.profile)))
  const [flash, setFlash] = useState({ type: 'success', message: '' })

  useEffect(() => { writeStoredJSON(STORAGE_KEYS.tokens, tokens) }, [tokens])
  useEffect(() => { writeStoredJSON(STORAGE_KEYS.profile, profile) }, [profile])

  useEffect(() => {
    if (flash.message !== 'Sessão encerrada com sucesso.') return undefined
    const timeout = window.setTimeout(() => setFlash({ type: 'success', message: '' }), 5000)
    return () => window.clearTimeout(timeout)
  }, [flash])

  useEffect(() => {
    if (!tokens?.access || profile) {
      setLoading(false)
      return undefined
    }
    let active = true
    setLoading(true)
    apiRequest('/auth/eu/')
      .then((response) => { if (active) setProfile(response) })
      .catch((error) => {
        if (active && error.status === 401) {
          clearStoredAuth()
          setTokens(null)
          setProfile(null)
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tokens?.access, profile])

  const setAuthenticated = useCallback((nextTokens, nextProfile) => {
    writeStoredJSON(STORAGE_KEYS.tokens, nextTokens)
    writeStoredJSON(STORAGE_KEYS.profile, nextProfile)
    setTokens(nextTokens)
    setProfile(nextProfile)
    setFlash({ type: 'success', message: '' })
    setLoading(false)
  }, [])

  const login = useCallback(async ({ email, senha, organizacao = 'psicologia' }) => {
    setLoading(true)
    try {
      const nextTokens = await apiRequest('/auth/login/', {
        method: 'POST',
        body: { organizacao, email, senha },
      })
      writeStoredJSON(STORAGE_KEYS.tokens, nextTokens)
      const nextProfile = await apiRequest('/auth/eu/')
      setAuthenticated(nextTokens, nextProfile)
      return { tokens: nextTokens, profile: nextProfile }
    } catch (error) {
      clearStoredAuth()
      setTokens(null)
      setProfile(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setAuthenticated])

  const register = useCallback(async ({ nome, email, senha, organizacao = 'psicologia' }) => {
    await apiRequest('/auth/cadastro/', {
      method: 'POST',
      body: { organizacao, nome, email, senha },
    })
    return login({ email, senha, organizacao })
  }, [login])

  const logout = useCallback(() => {
    clearStoredAuth()
    setTokens(null)
    setProfile(null)
    setFlash({ type: 'info', message: 'Sessão encerrada com sucesso.' })
    setLoading(false)
  }, [])

  const entrar = useCallback(async (email, senha) => login({ email, senha, organizacao: 'psicologia' }), [login])
  const pode = useCallback((permission) => Array.isArray(profile?.permissoes) && profile.permissoes.includes(permission), [profile])
  const inicio = pode('api.change_organizacao') ? '/admin/agenda' : '/dashboard'

  const value = useMemo(() => ({
    tokens,
    profile,
    loading,
    flash,
    setFlash,
    setAuthenticated,
    login,
    register,
    setProfile,
    logout,
    isAuthenticated: Boolean(tokens?.access),
    isAdmin: Array.isArray(profile?.permissoes) && profile.permissoes.includes('api.change_organizacao'),
    usuario: profile,
    setUsuario: setProfile,
    carregando: loading,
    entrar,
    sair: logout,
    pode,
    inicio,
  }), [tokens, profile, loading, flash, setAuthenticated, login, register, logout, entrar, pode, inicio])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
