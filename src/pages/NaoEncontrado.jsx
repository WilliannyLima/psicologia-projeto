import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.js'

export function NaoEncontrado() {
  const { isAuthenticated, isAdmin } = useAuth()
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  return <section className="card section-card empty-state"><div><h1>Página não encontrada</h1><p>O endereço solicitado não existe.</p><Link className="button-primary" to="/">Voltar ao início</Link></div></section>
}

export default NaoEncontrado
