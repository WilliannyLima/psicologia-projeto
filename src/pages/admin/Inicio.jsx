import { useEffect, useState } from 'react'
import { fetchAllPages } from '../../api/client.js'
import { Erro } from '../../components/Erro.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'
import { Indicador } from '../../components/Indicador.jsx'

export function InicioAdmin() {
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
      <CabecalhoPagina title="Administração" subtitle="Visão geral do consultório e das solicitações." />

      {loading ? <Carregando message="Carregando visão geral" /> : null}
      {error ? <><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadSummary}>Tentar de novo</button></> : null}

      {!loading && !error && stats ? (
        <div className="stats-grid admin-grid">
          <Indicador label="Pendentes" value={stats.pendentes} accent="primary" />
          <Indicador label="Profissionais" value={stats.profissionais} accent="secondary" />
          <Indicador label="Serviços" value={stats.servicos} accent="tertiary" />
          <Indicador label="Concluídos" value={stats.concluidos} accent="primary" />
        </div>
      ) : null}
    </section>
  )
}

export default InicioAdmin
