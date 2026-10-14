export function FiltroAtivo({ value, onChange }) {
  return (
    <div className="meta-actions">
      <button
        className={value === 'true' ? 'button-primary' : 'button-secondary'}
        onClick={() => onChange('true')}
      >
        Ativos
      </button>
      <button
        className={value === 'false' ? 'button-primary' : 'button-secondary'}
        onClick={() => onChange('false')}
      >
        Inativos
      </button>
    </div>
  )
}
