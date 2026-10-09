import { useEffect, useState } from 'react'
import { fetchAllPages } from '../services/api.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { StatCard } from '../components/ui/StatCard.jsx'

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError('')
      const [pending, completed, resources, services] = await Promise.all([
        fetchAllPages('/agendamentos/?status=solicitado'),
        fetchAllPages('/agendamentos/?status=concluido'),
        fetchAllPages('/recursos/'),
        fetchAllPages('/servicos/'),
      ])

      setStats({
        pendentes: pending.length,
        concluidos: completed.length,
        profissionais: resources.length,
        servicos: services.length,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSummary() }, [])

  return (
    <section className="page-block">
      <PageHeader title="Administração" subtitle="Visão geral do consultório e das solicitações." />

      {loading ? <LoadingState message="Carregando visão geral" /> : null}
      {error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadSummary}>Tentar de novo</button></> : null}

      {!loading && !error && stats ? (
        <div className="stats-grid admin-grid">
          <StatCard label="Pendentes" value={stats.pendentes} accent="primary" />
          <StatCard label="Profissionais" value={stats.profissionais} accent="secondary" />
          <StatCard label="Serviços" value={stats.servicos} accent="tertiary" />
          <StatCard label="Concluídos" value={stats.concluidos} accent="primary" />
        </div>
      ) : null}
    </section>
  )
}

export default AdminDashboardPage
