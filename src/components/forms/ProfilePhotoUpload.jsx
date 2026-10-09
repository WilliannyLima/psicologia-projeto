import { useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, requireProfileResponse } from '../../services/api.js'
import { getProfilePhoto } from '../../utils/formatters.js'
import { Alert } from '../ui/Alert.jsx'
import { ProfileAvatar } from '../ui/ProfileAvatar.jsx'

export function ProfilePhotoUpload({ profile, onProfileChange, onLoadingChange, disabled = false }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const requestInProgressRef = useRef(false)
  const preview = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : ''),
    [selectedFile],
  )

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    setSuccess('')

    if (!file) return

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024

    if (!acceptedTypes.includes(file.type)) {
      setError('Escolha uma imagem JPG, JPEG, PNG ou WEBP.')
      return
    }

    if (file.size > maxSize) {
      setError('A imagem deve ter no máximo 5 MB.')
      return
    }

    setSelectedFile(file)
  }

  const cancelSelection = () => {
    setSelectedFile(null)
    setError('')
    setSuccess('')
  }

  const handleUpload = async () => {
    if (!selectedFile || disabled || requestInProgressRef.current) return
    requestInProgressRef.current = true

    try {
      setLoading(true)
      onLoadingChange?.(true)
      setError('')
      setSuccess('')
      const body = new FormData()
      body.append('foto', selectedFile)
      const response = requireProfileResponse(await apiRequest('/auth/eu/', { method: 'PATCH', body }))
      onProfileChange(response)
      setSelectedFile(null)
      setSuccess('Foto de perfil atualizada com sucesso.')
    } catch (err) {
      setError(
        err.status === 400
          ? 'O arquivo precisa ser uma imagem.'
          : err.message || 'Não foi possível atualizar sua foto.',
      )
    } finally {
      requestInProgressRef.current = false
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const handleRemove = async () => {
    if (disabled || loading || requestInProgressRef.current) return
    requestInProgressRef.current = true
    try {
      setLoading(true)
      onLoadingChange?.(true)
      setError('')
      setSuccess('')
      const body = new FormData()
      body.append('foto', '')
      const response = requireProfileResponse(await apiRequest('/auth/eu/', { method: 'PATCH', body }))
      onProfileChange(response)
      setSuccess('Foto de perfil removida com sucesso.')
    } catch (err) {
      setError(err.status === 400 ? 'Não foi possível remover a foto.' : err.message)
    } finally {
      requestInProgressRef.current = false
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const currentProfile = selectedFile ? { ...profile, foto: preview } : profile

  return (
    <div className="profile-photo-section">
      <div className="profile-photo-preview">
        <ProfileAvatar profile={currentProfile} size="profile" />
        <label className="profile-photo-overlay" htmlFor="profile-photo-input" aria-disabled={disabled || loading}>
          <span aria-hidden="true">📷</span>
          <span>{selectedFile ? 'Trocar imagem' : 'Alterar foto'}</span>
        </label>
      </div>
      <div className="profile-photo-copy">
        <p className="eyebrow">Foto de perfil</p>
        <h2>{selectedFile ? 'Pré-visualização' : 'Personalize seu perfil'}</h2>
        <p>Escolha uma foto para personalizar seu perfil. JPG, PNG ou WEBP, até 5 MB.</p>
        <div className="profile-photo-actions">
          <label className="button-secondary" htmlFor="profile-photo-input" aria-disabled={disabled || loading}>
            {getProfilePhoto(profile) ? 'Alterar foto' : 'Adicionar foto'}
          </label>
          {getProfilePhoto(profile) ? (
            <button type="button" className="button-ghost" onClick={handleRemove} disabled={disabled || loading}>
              Remover foto
            </button>
          ) : null}
          <input
            id="profile-photo-input"
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Selecionar foto de perfil"
            disabled={disabled || loading}
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <>
              <button type="button" className="button-primary" onClick={handleUpload} disabled={disabled || loading}>
                {loading ? 'Salvando...' : 'Confirmar foto'}
              </button>
              <button type="button" className="button-ghost" onClick={cancelSelection} disabled={disabled || loading}>
                Cancelar
              </button>
            </>
          ) : null}
        </div>
        {error ? <Alert type="danger" message={error} /> : null}
        {success ? <Alert type="success" message={success} /> : null}
      </div>
    </div>
  )
}

export default ProfilePhotoUpload
