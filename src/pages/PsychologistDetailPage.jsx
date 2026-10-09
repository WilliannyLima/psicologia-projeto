import { resolveRelatedName } from '../utils/appointments.js'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hasPermission, fetchAllPages, apiRequest } from '../services/api.js'
import { Alert } from '../components/ui/Alert.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { ProfileAvatar } from '../components/ui/ProfileAvatar.jsx'
import { BackButton } from '../components/layout/BackButton.jsx'

export function PsychologistDetailPage({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [professional, setProfessional] = useState(null)
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewNext, setReviewNext] = useState(false)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfessional = async () => {
    try {
      setLoading(true)
      setError('')
      const [resource, allServices, reviewResponse] = await Promise.all([
        apiRequest(`/recursos/${id}/`),
        fetchAllPages('/servicos/'),
        apiRequest(`/avaliacoes/?recurso=${id}`),
      ])
      setProfessional(resource)
          const directServices = Array.isArray(resource.servicos) ? resource.servicos : Array.isArray(resource.servicos_oferecidos) ? resource.servicos_oferecidos : []
          const resourceServiceIds = directServices.map((item) => item.id || item)
          setServices(directServices.length > 0 && typeof directServices[0] === 'object'
            ? directServices
            : allServices.filter((service) => resourceServiceIds.includes(service.id)))
      const list = Array.isArray(reviewResponse?.results) ? reviewResponse.results : Array.isArray(reviewResponse) ? reviewResponse : []
      setReviews(list)
      setReviewNext(Boolean(reviewResponse?.next))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfessional() }, [id])

  const loadMoreReviews = async () => {
    if (reviewLoading) return
    const nextPage = reviewPage + 1
    try {
      setReviewLoading(true)
      setReviewError('')
      const response = await apiRequest(`/avaliacoes/?recurso=${id}&page=${nextPage}`)
      const list = Array.isArray(response?.results) ? response.results : []
      setReviews((current) => [...current, ...list])
      setReviewPage(nextPage)
      setReviewNext(Boolean(response?.next))
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setReviewLoading(false)
    }
  }


  if (loading) {
    return (
      <section className="page-block">
        <BackButton label="Voltar para profissionais" to="/psicologos" />
        <LoadingState message="Carregando perfil do psicólogo" />
      </section>
    )
  }
  if (error) {
    return (
      <section className="page-block">
        <BackButton label="Voltar para profissionais" to="/psicologos" />
        <Alert type="danger" message={error} />
        <button type="button" className="button-secondary" onClick={loadProfessional}>Tentar de novo</button>
      </section>
    )
  }

  return (
    <section className="page-block">
      <BackButton label="Voltar para profissionais" to="/psicologos" />
      <div className="card section-card profile-card">
        <ProfileAvatar profile={professional} size="profile" />
        <div>
          <p className="eyebrow">Perfil</p>
          <h2>{professional?.nome}</h2>
          {professional?.bio ? <p>{professional.bio}</p> : null}
        </div>
      </div>
      {hasPermission(profile?.permissoes, 'api.add_agendamento') ? <button type="button" className="button-primary" onClick={() => navigate('/agendar', { state: { resource: professional } })}>Agendar com este psicólogo</button> : null}
      {services.length > 0 ? <div className="card section-card"><h3>Serviços</h3><div className="service-grid">{services.map((service) => <div className="service-card" key={service.id}><strong>{service.nome}</strong>{service.descricao ? <span>{service.descricao}</span> : null}</div>)}</div></div> : null}
      <div className="card section-card">
        <h3>Avaliações</h3>
        {reviewError ? <Alert type="danger" message={reviewError} /> : null}
        {reviews.length === 0 ? <p className="muted">Ainda sem avaliações.</p> : <div className="list-stack">{reviews.map((review) => <div className="list-item" key={review.id}><div><strong>{review.nota}/5</strong><p>{review.comentario || 'Sem comentário'}</p><p>Serviço: {resolveRelatedName(review.servico, services, review.servico_nome || review.nome_servico) || 'Não informado'}</p></div></div>)}</div>}
        {reviewNext ? <button type="button" className="button-secondary" disabled={reviewLoading} onClick={loadMoreReviews}>{reviewLoading ? 'Carregando...' : 'Carregar mais'}</button> : null}
      </div>
    </section>
  )
}

export default PsychologistDetailPage
