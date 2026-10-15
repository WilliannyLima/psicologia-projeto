function formatStatus(status) {
  if (!status) return 'Não informado'
  const labels = { solicitado: 'Solicitada', confirmado: 'Confirmada', confirmada: 'Confirmada', realizado: 'Realizada', concluido: 'Concluída', concluído: 'Concluída', cancelado: 'Cancelada', cancelled: 'Cancelada', pendente: 'Pendente' }
  return labels[String(status).toLowerCase()] || String(status).replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}

export function StatusSessao({ status }) {
  return <span className="badge">{formatStatus(status)}</span>
}

export default StatusSessao
