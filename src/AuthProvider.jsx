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

  async function entrar(emailOuDados, senhaInformada) {
    const { email, senha } = typeof emailOuDados === 'object'
      ? emailOuDados
      : { email: emailOuDados, senha: senhaInformada }
    const tokens = await apiRequest('/auth/login/', {
      method: 'POST',
      body: { organizacao: 'psicologia', email, senha },
    })

    writeStoredJSON(STORAGE_KEYS.tokens, tokens)

    try {
      const perfil = await apiRequest('/auth/eu/')
      writeStoredJSON(STORAGE_KEYS.profile, perfil)
      setUsuario(perfil)
      return { profile: perfil }
    } catch (erro) {
      clearStoredAuth()
      throw erro
    }
  }

  async function cadastrar(dadosOuNome, emailInformado, senhaInformada) {
    const { nome, email, senha } = typeof dadosOuNome === 'object'
      ? dadosOuNome
      : { nome: dadosOuNome, email: emailInformado, senha: senhaInformada }
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
  const isAuthenticated = Boolean(readStoredJSON(STORAGE_KEYS.tokens)?.access)

  return (
    <AuthContext.Provider value={{
      usuario,
      profile: usuario,
      setUsuario,
      setProfile: setUsuario,
      carregando,
      loading: carregando,
      entrar,
      login: entrar,
      cadastrar,
      register: cadastrar,
      sair,
      logout: sair,
      pode,
      inicio,
      flash,
      setFlash,
      isAuthenticated,
      isAdmin: pode('api.change_organizacao'),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
