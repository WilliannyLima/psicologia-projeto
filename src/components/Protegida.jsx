import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.js'
import { hasPermission } from '../api/client.js'
import { Carregando } from './Carregando.jsx'

export function Protegida({ children, permissao }) {
  const { isAuthenticated, isAdmin, loading, profile } = useAuth()
  if (loading) return <Carregando />
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (permissao === 'admin' && !isAdmin) return <Navigate to="/dashboard" replace />
  if (permissao === 'agendar' && !hasPermission(profile?.permissoes, 'api.add_agendamento')) return <Navigate to="/dashboard" replace />
  return children
}

export default Protegida
