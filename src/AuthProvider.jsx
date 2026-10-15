import { useEffect, useState } from 'react'
import { apiRequest, clearStoredAuth, readStoredJSON, STORAGE_KEYS, writeStoredJSON } from './api/client.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => readStoredJSON(STORAGE_KEYS.profile))
  const [carregando, setCarregando] = useState(() => Boolean(readStoredJSON(STORAGE_KEYS.tokens)?.access))
  const [flash, setFlash] = useState({ type: 'success', message: '' })

  useEffect(() => {
    if (!readStoredJSON(STORAGE_KEYS.tokens)?.access) {
      setCarregando(false)
      return
    }

    apiRequest('/auth/eu/')
      .then(setUsuario)
      .catch(() => {
        clearStoredAuth()
        setUsuario(null)
      })
      .finally(() => setCarregando(false))
  }, [])

  async function entrar(email, senha) {
    setCarregando(true)

    try {
      const tokens = await apiRequest('/auth/login/', {
        method: 'POST',
        body: { organizacao: 'psicologia', email, senha },
      })

      writeStoredJSON(STORAGE_KEYS.tokens, tokens)

      const perfil = await apiRequest('/auth/eu/')
      writeStoredJSON(STORAGE_KEYS.profile, perfil)
      setUsuario(perfil)
    } finally {
      setCarregando(false)
    }
  }

  async function cadastrar(nome, email, senha) {
    await apiRequest('/auth/cadastro/', {
      method: 'POST',
      body: { organizacao: 'psicologia', nome, email, senha },
    })

    return entrar(email, senha)
  }

  function sair() {
    clearStoredAuth()
    setUsuario(null)
    setFlash({ type: 'info', message: 'Sessão encerrada com sucesso.' })
  }

  function pode(permissao) {
    return Array.isArray(usuario?.permissoes) && usuario.permissoes.includes(permissao)
  }

  const inicio = pode('api.change_organizacao') ? '/admin/agenda' : '/dashboard'

  return (
    <AuthContext.Provider value={{
      usuario,
      setUsuario,
      carregando,
      entrar,
      cadastrar,
      sair,
      pode,
      inicio,
      flash,
      setFlash,
      isAuthenticated: Boolean(readStoredJSON(STORAGE_KEYS.tokens)?.access),
      isAdmin: pode('api.change_organizacao'),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
