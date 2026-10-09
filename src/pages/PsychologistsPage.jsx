import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllPages } from '../services/api.js'
import { getProfessionalPhoto } from '../utils/formatters.js'
import { Alert } from '../components/ui/Alert.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { ProfileAvatar } from '../components/ui/ProfileAvatar.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

export function PsychologistsPage() {
  const [psychologists, setPsychologists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)
  const requestInProgressRef = useRef(false)

  const loadPsychologists = async () => {
    if (requestInProgressRef.current) return
    requestInProgressRef.current = true
    const requestId = ++requestIdRef.current

    try {
      setLoading(true)
      setError('')
      const professionals = await fetchAllPages('/recursos/', { strict: true })
      if (requestId !== requestIdRef.current) return
      if (!professionals.every((professional) => (
        professional &&
        typeof professional === 'object' &&
        !Array.isArray(professional) &&
        professional.id !== undefined &&
        professional.id !== null
      ))) {
        throw new Error('A API retornou dados de profissionais inválidos.')
      }
      setPsychologists(professionals)
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
      requestInProgressRef.current = false
    }
  }

  useEffect(() => {
    loadPsychologists()
  }, [])

  return (
    <section className="page-block">
      <PageHeader
        title="Psicólogos"
        subtitle="Encontre um profissional para acompanhar sua jornada."
        backLabel="Voltar para o painel"
        backTo="/dashboard"
      />

      {loading ? <LoadingState message="Carregando equipe" /> : null}
      {error ? <><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadPsychologists}>Tentar de novo</button></> : null}

      {!loading && !error && psychologists.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nenhum profissional disponível"
            description="Ainda não há profissionais cadastrados para apresentar."
          />
        </div>
      ) : null}

      {!loading && !error && psychologists.length > 0 ? (
        <div className="staff-grid">
          {psychologists.map((professional) => {
            const professionalProfile = {
              nome: professional.nome,
              foto: getProfessionalPhoto(professional),
            }
            const profession = professional.profissao || professional.cargo
            const specialty = professional.especialidade || professional.especialidades

            return (
              <article className="card staff-card" key={professional.id}>
                <ProfileAvatar profile={professionalProfile} size="professional" />
                <div className="staff-card-content">
                  <h3>{professional.nome || 'Profissional'}</h3>
                  {profession ? <span className="staff-profession">{profession}</span> : null}
                  {specialty ? <span className="staff-specialty">{specialty}</span> : null}
                  {professional.bio ? <p>{professional.bio}</p> : null}
                </div>
                <Link to={`/psicologo/${professional.id}`} className="button-primary staff-card-action">
                  Ver perfil
                </Link>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

export default PsychologistsPage
