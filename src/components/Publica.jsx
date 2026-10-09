import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from './Menu.jsx'
import { useAuth } from '../AuthContext.js'
import { Erro } from './Erro.jsx'

export function Publica() {
  const location = useLocation()
  const { flash } = useAuth()
  return <div className={`app-shell public-shell ${location.pathname === '/login' ? 'login-shell' : ''} ${location.pathname === '/esqueci-minha-senha' ? 'reset-shell' : ''} ${location.pathname === '/' ? 'landing-shell' : ''}`}><Menu /><div className="main-area"><main className="page-shell">{flash.message ? <Erro type={flash.type} message={flash.message} /> : null}<Outlet /></main></div></div>
}

export default Publica
