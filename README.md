# Psicologia

## Descrição
Sistema web para gestão de consultório de psicologia, com navegação para pacientes e administradores, organização de agenda, acompanhamento de sessões, cadastro de profissionais e administração dos serviços e avaliações.

## Objetivo
Permitir que o cliente web consuma a API de agendamentos do projeto Psicologia, oferecendo uma interface profissional e responsiva para acompanhar agendamentos, visualizar profissionais e gerenciar o consultório.

## Tecnologias utilizadas
- React
- Vite
- JavaScript
- React Router
- Fetch API
- Vercel

## Funcionalidades
- Login e cadastro de pacientes
- Recuperação de senha
- Perfil do usuário
- Dashboard inicial e visão geral
- Agendamento de consultas
- Lista de sessões e histórico
- Visualização de profissionais
- Painel administrativo para agenda, solicitações e avaliações
- Configuração do negócio e identidade visual
- Tratamento de carregamento e erros da API

## Estrutura básica do projeto
- `src/App.jsx`: aplicação principal com rotas e páginas
- `src/App.css`: estilos visuais do sistema
- `src/main.jsx`: entrada da aplicação
- `public/`: arquivos públicos do Vite
- `docs/`: especificações do projeto e regras do professor

## Como instalar
1. Clone o repositório.
2. Acesse a pasta do projeto.
3. Instale as dependências:

```bash
npm install
```

## Como executar localmente
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173` por padrão.

## Como configurar a URL da API
A URL base da API pode ser configurada por variável de ambiente:

```bash
VITE_API_BASE_URL=https://agendamentos.spaincentral.cloudapp.azure.com/api
```

Crie um arquivo `.env` na raiz do projeto com essa variável, ou ajuste diretamente no código caso necessário.

## Como fazer o build
```bash
npm run build
```

## Deploy no Vercel
1. Faça login no Vercel.
2. Importe o repositório.
3. Defina a variável de ambiente `VITE_API_BASE_URL` com a URL da API.
4. Publique o projeto.
5. O Vercel executará automaticamente o build do Vite.

## Integrantes do grupo
- [Nome do integrante 1]
- [Nome do integrante 2]

OBS.: O projeto foi desenvolvido seguindo as instruções específicas da pasta `docs/psicologia.md`.
