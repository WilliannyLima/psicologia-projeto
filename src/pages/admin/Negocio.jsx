import { useAuth } from '../../AuthContext.js'
import { useEffect, useState } from 'react'
import { hasPermission, apiRequest } from '../../api/client.js'
import { Erro } from '../../components/Erro.jsx'
import { ErrosCampos } from '../../components/ErrosCampos.jsx'
import { CabecalhoPagina } from '../../components/CabecalhoPagina.jsx'
import { Carregando } from '../../components/Carregando.jsx'

export function Negocio() {
  const { profile } = useAuth()
  const permissions = profile?.permissoes
  const [organization, setOrganization] = useState(null); const [form, setForm] = useState({ nome: '', descricao: '' }); const [logo, setLogo] = useState(null); const [removeLogo, setRemoveLogo] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [fieldErrors, setFieldErrors] = useState({}); const [success, setSuccess] = useState('')
  const canEdit = hasPermission(permissions, 'api.change_organizacao')
  const load = async () => { try { setLoading(true); setError(''); const response = await apiRequest('/organizacao/'); setOrganization(response); setForm({ nome: response?.nome || '', descricao: response?.descricao || '' }) } catch (err) { setError(err.message) } finally { setLoading(false) } }; useEffect(() => { load() }, [])
  const submit = async (event) => { event.preventDefault(); try { setSaving(true); setError(''); setFieldErrors({}); const body = new FormData(); body.append('nome', form.nome); body.append('descricao', form.descricao); if (removeLogo) body.append('logo', ''); else if (logo) body.append('logo', logo); const response = await apiRequest('/organizacao/', { method: 'PATCH', body }); setOrganization(response); setLogo(null); setRemoveLogo(false); setSuccess('Dados do negócio atualizados com sucesso.') } catch (err) { setError(err.message); setFieldErrors(err.fields || {}) } finally { setSaving(false) } }
  return <section className="page-block"><CabecalhoPagina title="Dados do negócio" subtitle="Configure os dados da organização." backLabel="Voltar para administração" backTo="/admin" />{loading ? <Carregando message="Carregando dados do negócio" /> : null}{error ? <><Erro type="danger" message={error} /><button type="button" className="button-secondary" onClick={load}>Tentar de novo</button></> : null}{success ? <Erro type="success" message={success} /> : null}<div className="card section-card"><form className="stack-form" onSubmit={submit}><label>Nome<input name="nome" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} disabled={!canEdit} /></label><label>Descrição<textarea name="descricao" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} disabled={!canEdit} /></label><label>Logo<input type="file" accept="image/*" onChange={(event) => { setLogo(event.target.files?.[0] || null); setRemoveLogo(false) }} disabled={!canEdit} /></label>{organization?.logo ? <><img className="admin-image-preview" src={organization.logo} alt="Logo da organização" /><button type="button" className="button-ghost small-button" onClick={() => { setLogo(null); setRemoveLogo(true) }} disabled={!canEdit}>Remover logo</button></> : null}<ErrosCampos errors={fieldErrors} />{canEdit ? <button className="button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button> : null}</form></div></section>
}

export default Negocio
