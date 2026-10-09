import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hasPermission, apiRequest } from '../services/api.js'
import { Alert } from '../components/ui/Alert.jsx'
import { FieldErrors } from '../components/forms/FieldErrors.jsx'
import { PageHeader } from '../components/layout/PageHeader.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { BackButton } from '../components/layout/BackButton.jsx'

export function ReviewAppointmentPage({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [appointment, setAppointment] = useState(null)
  const [checking, setChecking] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const canReview = hasPermission(profile?.permissoes, 'api.avaliar_agendamento')

  const loadAppointment = async () => {
    try {
      setChecking(true)
      setError('')
      setAppointment(await apiRequest(`/agendamentos/${id}/`))
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => { loadAppointment() }, [id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (rating < 1 || rating > 5) {
      setError('Selecione uma nota de 1 a 5.')
      return
    }
    try {
      setLoading(true)
      setError('')
      setFieldErrors({})
      await apiRequest(`/agendamentos/${id}/avaliar/`, {
        method: 'POST',
        body: { nota: rating, comentario: comment },
      })
      navigate(`/sessao/${id}`, { replace: true, state: { message: 'Avaliação enviada com sucesso.' } })
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
    } finally {
      setLoading(false)
    }
  }

  const existingReview = appointment?.avaliacao || appointment?.avaliacoes?.[0]
  const alreadyReviewed = (appointment?.nota !== undefined && appointment?.nota !== null) || Boolean(existingReview)
  const eligible = appointment?.status === 'concluido' && !alreadyReviewed

  if (!profile) return <section className="page-block"><LoadingState message="Carregando perfil" /></section>
  if (!canReview) return <section className="page-block"><BackButton label="Voltar para sessão" to={`/sessao/${id}`} /><Alert type="danger" message="Você não tem permissão para avaliar esta sessão." /></section>
  if (checking) return <section className="page-block"><BackButton label="Voltar para sessão" to={`/sessao/${id}`} /><LoadingState message="Carregando sessão" /></section>
  if (error) return <section className="page-block"><BackButton label="Voltar para sessão" to={`/sessao/${id}`} /><Alert type="danger" message={error} /><button type="button" className="button-secondary" onClick={loadAppointment}>Tentar de novo</button></section>
  if (!eligible) return <section className="page-block"><BackButton label="Voltar para sessão" to={`/sessao/${id}`} /><Alert type="info" message="Esta sessão não está disponível para avaliação." /></section>

  return (
    <section className="page-block">
      <PageHeader title="Avaliar sessão" subtitle="Compartilhe como foi seu atendimento." backLabel="Voltar para sessão" backTo={`/sessao/${id}`} />
      <div className="card section-card">
        <form className="stack-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Nota</legend>
            <div className="meta-actions">
              {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={rating === value ? 'button-primary' : 'button-secondary'} onClick={() => setRating(value)}>{value}</button>)}
            </div>
          </fieldset>
          <p className="muted">As avaliações ficam visíveis para todos os pacientes, sem exibir seu nome. Evite informar dados pessoais ou clínicos no comentário.</p>
          <label>Comentário<textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label>
          <FieldErrors errors={fieldErrors} />
          {error ? <Alert type="danger" message={error} /> : null}
          <button type="submit" className="button-primary" disabled={loading}>{loading ? 'Enviando...' : 'Enviar avaliação'}</button>
        </form>
      </div>
    </section>
  )
}

export default ReviewAppointmentPage
