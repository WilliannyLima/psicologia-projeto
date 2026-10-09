import { Link } from 'react-router-dom'

export function Entrada() {
  return (
    <main className="landing-page">
      <section className="landing-entry">
        <div className="hero-copy">
          <div className="landing-brand">
            <span className="landing-lotus" aria-hidden="true">✦</span>
            <span><strong>Espaço Acolher</strong><small>PSICOLOGIA</small></span>
          </div>
          <div className="landing-copy">
            <p className="eyebrow">Cuidado <span>•</span> Escuta <span>•</span> Bem-estar</p>
            <h1>Cuidar de você<br />também é um ato<br /><em>de coragem.</em></h1>
            <p className="hero-description">
              Aqui você encontra um espaço seguro para se ouvir, se cuidar e viver melhor.
            </p>
            <Link to="/login" className="button-primary hero-cta">
              Começar <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="entry-scene" aria-label="Ambiente acolhedor de psicologia">
          <div className="scene-halo" />
          <div className="scene-wall" />
          <div className="scene-window"><span /></div>
          <div className="scene-plant scene-plant-left"><i /><i /><i /><b /></div>
          <div className="scene-plant scene-plant-right"><i /><i /><i /><b /></div>
          <div className="scene-chair"><span className="chair-back" /><span className="chair-seat" /><span className="chair-leg chair-leg-left" /><span className="chair-leg chair-leg-right" /></div>
          <div className="scene-table"><span /><b /></div>
          <div className="scene-rug" />
        </div>
      </section>
    </main>
  )
}

export default Entrada
