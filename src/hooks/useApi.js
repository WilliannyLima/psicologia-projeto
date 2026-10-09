import { useCallback, useState } from 'react'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(async (operation) => {
    setLoading(true)
    setError('')
    try {
      return await operation()
    } catch (requestError) {
      setError(requestError?.message || 'Não foi possível concluir a solicitação.')
      throw requestError
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, setError, run }
}

export default useApi
