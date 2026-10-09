import { BackButton } from '../layout/BackButton.jsx'

export function PageHeader({ title, subtitle, children, backLabel, backTo }) {
  return (
    <div className="page-header">
      <div>
        {backLabel ? <BackButton label={backLabel} to={backTo} /> : null}
        <p className="eyebrow">Psicologia</p>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

export default PageHeader
