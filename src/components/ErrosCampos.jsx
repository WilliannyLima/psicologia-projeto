

export function ErrosCampos({ errors }) {
  return Object.entries(errors || {})
    .filter(([field]) => field !== 'general')
    .map(([field, message]) => <small className="field-error" key={field}>{field}: {message}</small>)
}

export default ErrosCampos
