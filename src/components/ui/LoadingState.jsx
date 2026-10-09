

export function LoadingState({ message = 'Carregando informações...' }) {
  return (
    <div className="loading-box">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  )
}

export default LoadingState
