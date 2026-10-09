import { formatStatus } from '../utils/formatters.js'

export function StatusSessao({ status }) {
  return <span className="badge">{formatStatus(status)}</span>
}

export default StatusSessao
