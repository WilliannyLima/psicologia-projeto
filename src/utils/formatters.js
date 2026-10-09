export function formatCurrency(value) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

export function formatDate(dateString) {
  if (!dateString) return 'Data não informada'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatStatus(status) {
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

export function getProfilePhoto(profile) {
  return profile?.foto || profile?.foto_url || profile?.avatar || profile?.avatar_url || ''
}

export function formatDisplayName(name) {
  if (!name) return 'seja bem-vindo(a)'
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function getProfessionalPhoto(professional) {
  return professional?.foto || professional?.foto_url || professional?.imagem || professional?.imagem_url || ''
}
