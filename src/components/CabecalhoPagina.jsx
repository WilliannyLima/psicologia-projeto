import { BotaoVoltar } from './BotaoVoltar.jsx'

export function CabecalhoPagina({ title, subtitle, children, backLabel, backTo }) {
  return (
    <div className="page-header">
      <div>
        {backLabel ? <BotaoVoltar label={backLabel} to={backTo} /> : null}
        <p className="eyebrow">Psicologia</p>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

export default CabecalhoPagina
