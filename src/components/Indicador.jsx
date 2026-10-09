

export function Indicador({ label, value, accent = 'primary' }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default Indicador
