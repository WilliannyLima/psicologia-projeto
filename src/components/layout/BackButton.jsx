import { useNavigate } from 'react-router-dom'

export function BackButton({ label = 'Voltar', to }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="back-button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <span aria-hidden="true">←</span> {label}
    </button>
  )
}

export default BackButton
