

export function StatCard({ label, value, accent = 'primary' }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default StatCard
