import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext.js'
import { Protegida } from './components/Protegida.jsx'
import { Layout } from './components/Layout.jsx'
import { Publica } from './components/Publica.jsx'
import { Entrada } from './pages/Entrada.jsx'
import { Inicio } from './pages/Inicio.jsx'
import { Login } from './pages/Login.jsx'
import { Cadastro } from './pages/Cadastro.jsx'
import { EsqueciSenha } from './pages/EsqueciSenha.jsx'
import { AlterarSenha } from './pages/AlterarSenha.jsx'
import { Perfil } from './pages/Perfil.jsx'
import { Psicologos } from './pages/Psicologos.jsx'
import { Psicologo } from './pages/Psicologo.jsx'
import { MinhasSessoes } from './pages/MinhasSessoes.jsx'
import { Sessao } from './pages/Sessao.jsx'
import { Avaliar } from './pages/Avaliar.jsx'
import { NaoEncontrado } from './pages/NaoEncontrado.jsx'
import { InicioAdmin } from './pages/admin/Inicio.jsx'
import { Agenda } from './pages/admin/Agenda.jsx'
import { SessaoAdmin } from './pages/admin/Sessao.jsx'
import { AConfirmar } from './pages/admin/AConfirmar.jsx'
import { HistoricoSolicitacoes } from './pages/admin/HistoricoSolicitacoes.jsx'
import { Negocio } from './pages/admin/Negocio.jsx'
import { PsicologosAdmin } from './pages/admin/Psicologos.jsx'
import { FormularioPsicologo } from './pages/admin/Psicologo.jsx'
import { Horarios } from './pages/admin/Horarios.jsx'
import { Servicos } from './pages/admin/Servicos.jsx'
import { Servico } from './pages/admin/Servico.jsx'
import { Avaliacoes } from './pages/admin/Avaliacoes.jsx'
import { AgendamentoProvider } from './pages/agendar/AgendamentoProvider.jsx'
import { LayoutAgendamento } from './pages/agendar/LayoutAgendamento.jsx'
import { EscolherServico } from './pages/agendar/EscolherServico.jsx'
import { EscolherPsicologo } from './pages/agendar/EscolherPsicologo.jsx'
import { EscolherHorario } from './pages/agendar/EscolherHorario.jsx'
import { Confirmar } from './pages/agendar/Confirmar.jsx'
import { Enviado } from './pages/agendar/Enviado.jsx'
import './App.css'

function InicioRota() {
  const { isAuthenticated, loading, isAdmin } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  return <Entrada />
}

function AcessoPublico({ children }) {
  const { isAuthenticated, loading, isAdmin } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route element={<Publica />}>
        <Route path="/" element={<InicioRota />} />
        <Route path="/login" element={<AcessoPublico><Login /></AcessoPublico>} />
        <Route path="/cadastro" element={<AcessoPublico><Cadastro /></AcessoPublico>} />
        <Route path="/esqueci-minha-senha" element={<EsqueciSenha />} />
        <Route path="*" element={<NaoEncontrado />} />
      </Route>

      <Route element={<Protegida><Layout /></Protegida>}>
        <Route path="/dashboard" element={<Inicio />} />
        <Route path="/minhas-sessoes" element={<MinhasSessoes />} />
        <Route path="/sessao/:id" element={<Sessao />} />
        <Route path="/sessao/:id/avaliar" element={<Avaliar />} />
        <Route path="/psicologos" element={<Psicologos />} />
        <Route path="/psicologo/:id" element={<Psicologo />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/alterar-senha" element={<AlterarSenha />} />
        <Route path="/admin" element={<Protegida permissao="admin"><InicioAdmin /></Protegida>} />
        <Route path="/admin/agenda" element={<Protegida permissao="admin"><Agenda /></Protegida>} />
        <Route path="/admin/sessao/:id" element={<Protegida permissao="admin"><SessaoAdmin /></Protegida>} />
        <Route path="/admin/solicitacoes" element={<Protegida permissao="admin"><AConfirmar /></Protegida>} />
        <Route path="/admin/historico-solicitacoes" element={<Protegida permissao="admin"><HistoricoSolicitacoes /></Protegida>} />
        <Route path="/admin/organizacao" element={<Protegida permissao="admin"><Negocio /></Protegida>} />
        <Route path="/admin/avaliacoes" element={<Protegida permissao="admin"><Avaliacoes /></Protegida>} />
        <Route path="/admin/psicologos" element={<Protegida permissao="admin"><PsicologosAdmin /></Protegida>} />
        <Route path="/admin/psicologos/novo" element={<Protegida permissao="admin"><FormularioPsicologo /></Protegida>} />
        <Route path="/admin/psicologos/:id/editar" element={<Protegida permissao="admin"><FormularioPsicologo /></Protegida>} />
        <Route path="/admin/psicologos/:id/horarios" element={<Protegida permissao="admin"><Horarios /></Protegida>} />
        <Route path="/admin/servicos" element={<Protegida permissao="admin"><Servicos /></Protegida>} />
        <Route path="/admin/servicos/novo" element={<Protegida permissao="admin"><Servico /></Protegida>} />
        <Route path="/admin/servicos/:id/editar" element={<Protegida permissao="admin"><Servico /></Protegida>} />
        <Route path="agendar" element={<Protegida permissao="agendar"><AgendamentoProvider><LayoutAgendamento /></AgendamentoProvider></Protegida>}>
        <Route index element={<EscolherServico />} />
        <Route path="psicologo" element={<EscolherPsicologo />} />
        <Route path="horario" element={<EscolherHorario />} />
        <Route path="confirmar" element={<Confirmar />} />
        <Route path="enviado" element={<Enviado />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
