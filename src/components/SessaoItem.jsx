import { Link } from 'react-router-dom'
import { StatusSessao } from './StatusSessao.jsx'

export function SessaoItem({ to, title, subtitle, status, children }) {
  const Content = to ? Link : 'div'
  const navigationProps = to ? { to } : {}
  return <Content {...navigationProps} className="list-item"><div><strong>{title}</strong>{subtitle ? <p>{subtitle}</p> : null}{children}</div><StatusSessao status={status} /></Content>
}

export default SessaoItem
