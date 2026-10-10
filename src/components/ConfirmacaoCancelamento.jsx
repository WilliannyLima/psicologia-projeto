export function ConfirmacaoCancelamento({ open, onClose, onConfirm, loading = false }) {
  if (!open) return null

  return (
    <div className="confirmation-backdrop" onClick={onClose}>
      <section className="confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="cancel-session-title" aria-describedby="cancel-session-message" onClick={(event) => event.stopPropagation()}>
        <div className="confirmation-icon" aria-hidden="true">!</div>
        <h2 id="cancel-session-title">Cancelar sessão?</h2>
        <p id="cancel-session-message">Tem certeza de que deseja cancelar esta sessão?</p>
        <div className="confirmation-actions">
          <button type="button" className="button-ghost" onClick={onClose}>Voltar</button>
          <button type="button" className="button-danger" onClick={onConfirm} disabled={loading}>{loading ? 'Cancelando...' : 'Cancelar sessão'}</button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmacaoCancelamento
