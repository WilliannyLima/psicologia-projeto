import { getProfilePhoto } from '../utils/formatters.js'

export function Foto({ profile, size = 'default', className = '' }) {
  const photo = getProfilePhoto(profile)
  const initial = (profile?.nome || 'P').charAt(0).toUpperCase()

  return (
    <span className={`profile-avatar profile-avatar-${size} ${className}`.trim()}>
      {photo ? (
        <img src={photo} alt={`Foto de ${profile?.nome || 'usuário'}`} />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  )
}

export default Foto
