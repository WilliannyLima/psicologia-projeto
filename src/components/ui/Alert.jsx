

export function Alert({ type = 'info', message }) {
  if (!message) return null

  return <div className={`alert alert-${type}`}>{message}</div>
}

export default Alert
