const API = import.meta.env.VITE_API_BASE_URL || 'https://agendamentos.spaincentral.cloudapp.azure.com/api'

export const STORAGE_KEYS = {
  tokens: 'psicologia_tokens',
  profile: 'psicologia_profile',
}

let renovandoToken = null

export function hasPermission(permissoes, permissao) {
  return Array.isArray(permissoes) && permissoes.includes(permissao)
}

export function readStoredJSON(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave))
  } catch {
    return null
  }
}

export function writeStoredJSON(chave, valor) {
  if (valor) {
    localStorage.setItem(chave, JSON.stringify(valor))
  } else {
    localStorage.removeItem(chave)
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEYS.tokens)
  localStorage.removeItem(STORAGE_KEYS.profile)
}

async function enviar(caminho, { method = 'GET', body, headers = {}, ignorarAuth = false } = {}) {
  const url = caminho.startsWith('http') ? caminho : API + caminho
  const tokens = readStoredJSON(STORAGE_KEYS.tokens)
  const cabecalhos = { ...headers }

  if (tokens?.access && !ignorarAuth) {
    cabecalhos.Authorization = `Bearer ${tokens.access}`
  }

  if (body && !(body instanceof FormData)) {
    cabecalhos['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }

  return fetch(url, { method, headers: cabecalhos, body })
}

async function renovarToken() {
  const refresh = readStoredJSON(STORAGE_KEYS.tokens)?.refresh
  if (!refresh) return false

  try {
    const resposta = await enviar('/auth/renovar/', {
      method: 'POST',
      body: { refresh },
      ignorarAuth: true,
    })

    if (!resposta.ok) return false

    const tokens = readStoredJSON(STORAGE_KEYS.tokens)
    writeStoredJSON(STORAGE_KEYS.tokens, { ...tokens, ...await resposta.json() })
    return true
  } catch {
    return false
  }
}

export async function api(caminho, opcoes = {}) {
  let resposta = await enviar(caminho, opcoes).catch(() => null)

  if (!resposta) {
    throw { status: 0, message: 'Não foi possível falar com o servidor.' }
  }

  const publicas = ['/auth/login/', '/auth/cadastro/', '/auth/redefinir-senha/']

  if (resposta.status === 401 && !publicas.includes(caminho) && !caminho.includes('/auth/renovar/')) {
    if (readStoredJSON(STORAGE_KEYS.tokens)?.refresh) {
      if (!renovandoToken) {
        renovandoToken = renovarToken().finally(() => renovandoToken = null)
      }

      if (await renovandoToken) {
        resposta = await enviar(caminho, opcoes)
      } else {
        clearStoredAuth()
        window.location.href = '/login'
      }
    } else {
      clearStoredAuth()
      window.location.href = '/login'
    }
  }

  const tipo = resposta.headers.get('content-type') || ''
  const dados = resposta.status === 204 ? null : tipo.includes('application/json')
    ? await resposta.json().catch(() => null)
    : await resposta.text().catch(() => null)

  if (!resposta.ok) {
    throw {
      status: resposta.status,
      dados,
      message: mensagemDeErro({ status: resposta.status, dados }),
      fields: extrairErrosCampos(dados),
    }
  }

  return dados
}

export async function buscarTodas(caminho) {
  let itens = []
  let proxima = caminho

  while (proxima) {
    const dados = await api(proxima)
    itens = [...itens, ...(Array.isArray(dados) ? dados : dados?.results || [])]
    proxima = dados?.next || null
  }

  return itens
}

export function mensagemDeErro(erro) {
  const dados = erro?.dados

  if (!erro?.status) return erro?.message || 'Não foi possível falar com o servidor.'
  if (erro.status === 403) return 'Você não tem permissão para esta ação.'
  if (erro.status === 404) return 'Não encontrado.'
  if (erro.status === 429) return 'Muitas tentativas, aguarde um minuto.'
  if (erro.status >= 500) return 'O serviço está temporariamente indisponível.'
  if (typeof dados === 'string') return dados
  if (Array.isArray(dados)) return dados.join(' ')
  if (dados?.detail) return dados.detail
  if (dados?.non_field_errors) return [].concat(dados.non_field_errors).join(' ')

  return Object.values(dados || {}).flatMap(valor =>
    valor && typeof valor === 'object' ? Object.values(valor).flat() : valor
  ).filter(Boolean).join(' • ') || 'Verifique os campos destacados.'
}

function extrairErrosCampos(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return {}

  const erros = {}

  Object.entries(dados).forEach(([campo, valor]) => {
    if (campo !== 'detail' && campo !== 'non_field_errors') {
      erros[campo] = [].concat(
        valor && typeof valor === 'object' ? Object.values(valor).flat() : valor
      ).join(' ')
    }
  })

  if (dados.non_field_errors) {
    erros.general = [].concat(dados.non_field_errors).join(' ')
  }

  return erros
}

export function requireProfileResponse(resposta) {
  if (!resposta || typeof resposta.nome !== 'string' || !resposta.nome.trim()) {
    throw new Error('A API retornou dados de perfil inválidos.')
  }

  return resposta
}

export function login(email, senha) {
  return api('/auth/login/', {
    method: 'POST',
    body: { email, senha },
  })
}

export function cadastrar(nome, email, senha) {
  return api('/auth/cadastro/', {
    method: 'POST',
    body: { nome, email, senha },
  })
}

export function redefinirSenha(email) {
  return api('/auth/redefinir-senha/', {
    method: 'POST',
    body: { email },
  })
}
