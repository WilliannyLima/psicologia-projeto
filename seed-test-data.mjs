const API = 'https://agendamentos.spaincentral.cloudapp.azure.com/api';
const ORGANIZACAO = 'psicologia';
const SENHA_TESTE = 'Teste@123';

const pacientes = [
  {
    nome: 'Ana Beatriz Souza',
    email: 'ana.teste@example.com',
  },
  {
    nome: 'Lucas Henrique Lima',
    email: 'lucas.teste@example.com',
  },
  {
    nome: 'Marina Alves Costa',
    email: 'marina.teste@example.com',
  },
];

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);

  let data = null;

  try {
    data = await response.json();
  } catch {
    // resposta sem JSON
  }

  if (!response.ok) {
    const error = new Error(
      data?.detail ||
      data?.message ||
      JSON.stringify(data) ||
      `HTTP ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

async function login(email, senha) {
  return request('/auth/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organizacao: ORGANIZACAO,
      email,
      senha,
    }),
  });
}

async function cadastrarPaciente(paciente) {
  try {
    const resultado = await request('/auth/cadastro/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizacao: ORGANIZACAO,
        nome: paciente.nome,
        email: paciente.email,
        senha: SENHA_TESTE,
      }),
    });

    console.log(`✓ Paciente criado: ${paciente.nome}`);
    return resultado;
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      console.log(
        `• Paciente já existente ou cadastro recusado: ${paciente.email}`
      );
      return null;
    }

    throw error;
  }
}

async function loginPaciente(paciente) {
  try {
    const resultado = await login(
      paciente.email,
      SENHA_TESTE
    );

    const token =
      resultado.access ||
      resultado.access_token ||
      resultado.token;

    if (!token) {
      throw new Error('A API não retornou token.');
    }

    return token;
  } catch (error) {
    console.log(
      `✗ Não foi possível entrar como ${paciente.email}: ${error.message}`
    );

    return null;
  }
}

async function criarRecurso(token, recurso) {
  const form = new FormData();

  form.append('nome', recurso.nome);
  form.append('bio', recurso.bio);
  form.append('capacidade', String(recurso.capacidade));
  form.append('ativo', String(recurso.ativo));

  return request('/recursos/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
}

async function listarRecursos(token) {
  return request('/recursos/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function obterOuCriarRecurso(token, dados) {
  const resposta = await listarRecursos(token);

  const lista = Array.isArray(resposta)
    ? resposta
    : resposta.results || [];

  const existente = lista.find(
    item => item.nome?.toLowerCase() === dados.nome.toLowerCase()
  );

  if (existente) {
    console.log(`• Recurso já existe: ${dados.nome} — ID ${existente.id}`);
    return existente;
  }

  const criado = await criarRecurso(token, dados);

  console.log(
    `✓ Recurso criado: ${dados.nome} — ID ${criado.id}`
  );

  return criado;
}

async function criarDisponibilidade(token, disponibilidade) {
  return request('/disponibilidades/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(disponibilidade),
  });
}

async function obterOuCriarDisponibilidade(token, disponibilidade) {
  const resposta = await request(
    `/disponibilidades/?recurso=${disponibilidade.recurso}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const lista = Array.isArray(resposta)
    ? resposta
    : resposta.results || [];

  const existente = lista.find(item =>
    Number(item.recurso?.id || item.recurso) === Number(disponibilidade.recurso) &&
    Number(item.dia_semana) === Number(disponibilidade.dia_semana) &&
    String(item.hora_inicio).slice(0, 5) === disponibilidade.hora_inicio &&
    String(item.hora_fim).slice(0, 5) === disponibilidade.hora_fim
  );

  if (existente) {
    console.log(`• Disponibilidade já existe — recurso ${disponibilidade.recurso}`);
    return existente;
  }

  const criada = await criarDisponibilidade(token, disponibilidade);
  console.log(`✓ Disponibilidade criada — recurso ${disponibilidade.recurso}`);
  return criada;
}

async function criarServico(token, servico) {
  const form = new FormData();

  form.append('nome', servico.nome);
  form.append('descricao', servico.descricao);
  form.append('duracao_min', String(servico.duracao_min));
  form.append('preco', String(servico.preco));
  form.append('ativo', 'true');

  for (const recurso of servico.recursos) {
    form.append('recursos', String(recurso));
  }

  return request('/servicos/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
}

async function listarServicos(token) {
  return request('/servicos/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function obterOuCriarServico(token, dados) {
  const resposta = await listarServicos(token);

  const lista = Array.isArray(resposta)
    ? resposta
    : resposta.results || [];

  const existente = lista.find(
    item => item.nome?.toLowerCase() === dados.nome.toLowerCase()
  );

  if (existente) {
    const detalhes = await request(`/servicos/${existente.id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const recursosExistentes = (
      detalhes.recursos || detalhes.recursos_ids || existente.recursos || existente.recursos_ids || []
    ).map(recurso => Number(recurso.id || recurso));
    const recursosAtualizados = [...new Set([
      ...recursosExistentes,
      ...dados.recursos.map(Number),
    ])];

    if (recursosAtualizados.length > recursosExistentes.length) {
      const form = new FormData();
      recursosAtualizados.forEach(recurso => form.append('recursos', String(recurso)));

      await request(`/servicos/${existente.id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      console.log(`• Recursos atualizados no serviço: ${dados.nome}`);
    }

    console.log(
      `• Serviço já existe: ${dados.nome} — ID ${existente.id}`
    );

    return existente;
  }

  const criado = await criarServico(token, dados);

  console.log(
    `✓ Serviço criado: ${dados.nome} — ID ${criado.id}`
  );

  return criado;
}

async function criarAgendamento(token, dados) {
  return request('/agendamentos/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });
}

async function listarAgendamentos(token) {
  const resposta = await request('/agendamentos/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(resposta)
    ? resposta
    : resposta.results || [];
}

async function obterIdPaciente(token) {
  const perfil = await request('/auth/eu/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Number(perfil.id || perfil.cliente?.id || perfil.user?.id);
}

function normalizarDataHora(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? String(valor || '').replace(' ', 'T').slice(0, 19)
    : data.getTime();
}

async function obterOuCriarAgendamento(token, dados, nome) {
  const existentes = await listarAgendamentos(token);
  const existente = existentes.find(item =>
    Number(item.cliente?.id ?? item.cliente ?? item.paciente?.id ?? item.paciente ?? item.cliente_id ?? item.paciente_id) === Number(dados.cliente) &&
    Number(item.servico?.id ?? item.servico) === Number(dados.servico) &&
    Number(item.recurso?.id ?? item.recurso) === Number(dados.recurso) &&
    normalizarDataHora(item.inicio) === normalizarDataHora(dados.inicio)
  );

  if (existente) {
    console.log(`• Agendamento já existe — ${nome}`);
    return existente;
  }

  const { cliente, ...dadosParaCriar } = dados;
  const criado = await criarAgendamento(token, dadosParaCriar);
  console.log(`✓ Agendamento criado — ${nome}`);
  return criado;
}

function proximaData(diaSemana, hora, minuto = 0) {
  const agora = new Date();
  const data = new Date(agora);

  let diferenca =
    (diaSemana - data.getDay() + 7) % 7;

  if (diferenca === 0) {
    diferenca = 7;
  }

  data.setDate(data.getDate() + diferenca);
  data.setHours(hora, minuto, 0, 0);

  const pad = numero =>
    String(numero).padStart(2, '0');

  return (
    `${data.getFullYear()}-` +
    `${pad(data.getMonth() + 1)}-` +
    `${pad(data.getDate())}T` +
    `${pad(data.getHours())}:` +
    `${pad(data.getMinutes())}:00`
  );
}

async function alterarAgendamento(
  token,
  id,
  acao
) {
  return request(`/agendamentos/${id}/${acao}/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function avaliarAgendamento(
  token,
  id
) {
  return request(`/agendamentos/${id}/avaliar/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nota: 5,
      comentario:
        'Atendimento excelente. Profissional muito atenciosa.',
    }),
  });
}

async function main() {
  console.log('');
  console.log('==========================================');
  console.log('   SEED DE DADOS — PROJETO PSICOLOGIA');
  console.log('==========================================');
  console.log('');

  const adminEmail =
    process.argv[2] ||
    await perguntar('E-mail do administrador: ');

  const adminSenha =
    process.argv[3] ||
    await perguntar('Senha do administrador: ');

  console.log('');
  console.log('1. Login do administrador...');

  let admin;

  try {
    admin = await login(
      adminEmail,
      adminSenha
    );
  } catch (error) {
    console.error(
      '✗ Não foi possível entrar como administrador.'
    );

    console.error(error.message);

    if (error.data) {
      console.error(error.data);
    }

    process.exit(1);
  }

  const adminToken =
    admin.access ||
    admin.access_token ||
    admin.token;

  if (!adminToken) {
    throw new Error(
      'A API não retornou o token do administrador.'
    );
  }

  console.log('✓ Administrador conectado.');
  console.log('');

  // ==========================================
  // PACIENTES
  // ==========================================

  console.log('2. Criando/verificando pacientes...');

  const tokensPacientes = {};

  for (const paciente of pacientes) {
    await cadastrarPaciente(paciente);

    const token =
      await loginPaciente(paciente);

    if (token) {
      tokensPacientes[paciente.email] = token;
    }
  }

  console.log('');

  // ==========================================
  // RECURSOS
  // ==========================================

  console.log('3. Criando/verificando psicólogos...');

  const camila = await obterOuCriarRecurso(
    adminToken,
    {
      nome: 'Dra. Camila Martins',
      bio:
        'Psicóloga clínica com atuação em ansiedade, desenvolvimento emocional e acompanhamento individual.',
      capacidade: 1,
      ativo: true,
    }
  );

  const rafael = await obterOuCriarRecurso(
    adminToken,
    {
      nome: 'Dr. Rafael Oliveira',
      bio:
        'Psicólogo com atuação em terapia cognitivo-comportamental e acompanhamento psicológico individual.',
      capacidade: 1,
      ativo: true,
    }
  );

  const juliana = await obterOuCriarRecurso(
    adminToken,
    {
      nome: 'Dra. Juliana Mendes',
      bio: 'Psicóloga clínica com atuação em saúde emocional e acompanhamento individual.',
      capacidade: 1,
      ativo: true,
    }
  );

  const felipe = await obterOuCriarRecurso(
    adminToken,
    {
      nome: 'Dr. Felipe Almeida',
      bio: 'Psicólogo com atuação em desenvolvimento emocional e acompanhamento psicológico.',
      capacidade: 1,
      ativo: true,
    }
  );

  const beatriz = await obterOuCriarRecurso(
    adminToken,
    {
      nome: 'Dra. Beatriz Carvalho',
      bio: 'Psicóloga com atuação em avaliação e orientação psicológica individual.',
      capacidade: 1,
      ativo: true,
    }
  );

  console.log('');

  // ==========================================
  // DISPONIBILIDADES
  // ==========================================

  console.log('4. Criando disponibilidades...');

  const disponibilidades = [
    {
      dia_semana: 1,
      hora_inicio: '08:00',
      hora_fim: '12:00',
      recurso: camila.id,
    },
    {
      dia_semana: 2,
      hora_inicio: '13:00',
      hora_fim: '17:00',
      recurso: camila.id,
    },
    {
      dia_semana: 3,
      hora_inicio: '08:00',
      hora_fim: '12:00',
      recurso: camila.id,
    },
    {
      dia_semana: 4,
      hora_inicio: '14:00',
      hora_fim: '18:00',
      recurso: camila.id,
    },
    {
      dia_semana: 5,
      hora_inicio: '08:00',
      hora_fim: '12:00',
      recurso: camila.id,
    },

    {
      dia_semana: 1,
      hora_inicio: '13:00',
      hora_fim: '17:00',
      recurso: rafael.id,
    },
    {
      dia_semana: 3,
      hora_inicio: '08:00',
      hora_fim: '12:00',
      recurso: rafael.id,
    },
    {
      dia_semana: 4,
      hora_inicio: '13:00',
      hora_fim: '17:00',
      recurso: rafael.id,
    },
    {
      dia_semana: 5,
      hora_inicio: '14:00',
      hora_fim: '18:00',
      recurso: rafael.id,
    },
    {
      dia_semana: 0,
      hora_inicio: '08:00',
      hora_fim: '12:00',
      recurso: juliana.id,
    },
    {
      dia_semana: 3,
      hora_inicio: '13:00',
      hora_fim: '17:00',
      recurso: juliana.id,
    },
    {
      dia_semana: 2,
      hora_inicio: '08:00',
      hora_fim: '12:00',
      recurso: felipe.id,
    },
    {
      dia_semana: 5,
      hora_inicio: '13:00',
      hora_fim: '17:00',
      recurso: felipe.id,
    },
    {
      dia_semana: 1,
      hora_inicio: '13:00',
      hora_fim: '17:00',
      recurso: beatriz.id,
    },
    {
      dia_semana: 4,
      hora_inicio: '08:00',
      hora_fim: '12:00',
      recurso: beatriz.id,
    },
  ];

  for (const disponibilidade of disponibilidades) {
    try {
      await obterOuCriarDisponibilidade(
        adminToken,
        disponibilidade
      );
    } catch (error) {
      console.log(
        `• Disponibilidade ignorada: ${error.message}`
      );
    }
  }

  console.log('');

  // ==========================================
  // SERVIÇOS
  // ==========================================

  console.log('5. Criando/verificando serviços...');

  const consulta =
    await obterOuCriarServico(
      adminToken,
      {
        nome: 'Consulta Psicológica',
        descricao:
          'Atendimento psicológico individual.',
        duracao_min: 50,
        preco: 120,
        recursos: [
          camila.id,
          rafael.id,
          juliana.id,
          felipe.id,
          beatriz.id,
        ],
      }
    );

  const avaliacao =
    await obterOuCriarServico(
      adminToken,
      {
        nome: 'Avaliação Psicológica',
        descricao:
          'Avaliação psicológica individual.',
        duracao_min: 60,
        preco: 150,
        recursos: [
          camila.id,
          juliana.id,
          beatriz.id,
        ],
      }
    );

  const acompanhamento =
    await obterOuCriarServico(
      adminToken,
      {
        nome: 'Acompanhamento Terapêutico',
        descricao:
          'Acompanhamento psicológico individual.',
        duracao_min: 50,
        preco: 130,
        recursos: [
          rafael.id,
          felipe.id,
        ],
      }
    );

  const orientacao =
    await obterOuCriarServico(
      adminToken,
      {
        nome: 'Orientação Psicológica',
        descricao:
          'Atendimento de orientação psicológica.',
        duracao_min: 40,
        preco: 100,
        recursos: [
          camila.id,
          rafael.id,
          juliana.id,
          felipe.id,
          beatriz.id,
        ],
      }
    );

  console.log('');

  // ==========================================
  // AGENDAMENTOS
  // ==========================================

  console.log('6. Criando agendamentos...');

  const anaToken =
    tokensPacientes['ana.teste@example.com'];

  const lucasToken =
    tokensPacientes['lucas.teste@example.com'];

  const marinaToken =
    tokensPacientes['marina.teste@example.com'];

  if (
    !anaToken ||
    !lucasToken ||
    !marinaToken
  ) {
    throw new Error(
      'Não foi possível obter os tokens de todos os pacientes.'
    );
  }

  const idsPacientes = {};
  for (const [email, token] of Object.entries(tokensPacientes)) {
    idsPacientes[email] = await obterIdPaciente(token);
  }

  const agendamentos = [];

  const dadosAgendamentos = [
    {
      nome:
        'Ana → Camila → Consulta → solicitado',

      token: anaToken,

      cliente: idsPacientes['ana.teste@example.com'],

      servico: consulta.id,

      recurso: camila.id,

      inicio:
        proximaData(1, 9),

      observacoes:
        'Primeira consulta fictícia para testes.',
    },

    {
      nome:
        'Lucas → Camila → Avaliação → confirmado',

      token: lucasToken,

      cliente: idsPacientes['lucas.teste@example.com'],

      servico: avaliacao.id,

      recurso: camila.id,

      inicio:
        proximaData(2, 14),

      observacoes:
        'Agendamento fictício para testar confirmação.',
    },

    {
      nome:
        'Marina → Camila → Orientação → concluído',

      token: marinaToken,

      cliente: idsPacientes['marina.teste@example.com'],

      servico: orientacao.id,

      recurso: camila.id,

      inicio:
        proximaData(3, 10),

      observacoes:
        'Atendimento fictício para testar avaliação.',
    },

    {
      nome:
        'Ana → Rafael → Acompanhamento → cancelado',

      token: anaToken,

      cliente: idsPacientes['ana.teste@example.com'],

      servico: acompanhamento.id,

      recurso: rafael.id,

      inicio:
        proximaData(4, 15),

      observacoes:
        'Agendamento fictício para testar cancelamento.',
    },
  ];

  for (const dados of dadosAgendamentos) {
    try {
      const criado =
        await obterOuCriarAgendamento(
          dados.token,
          {
            cliente: dados.cliente,
            servico: dados.servico,
            recurso: dados.recurso,
            inicio: dados.inicio,
            observacoes:
              dados.observacoes,
          },
          dados.nome
        );

      agendamentos.push({
        ...dados,
        ...criado,
        id: criado.id,
      });

    } catch (error) {
      console.log(
        `✗ ${dados.nome}: ${error.message}`
      );

      if (error.data) {
        console.log(
          JSON.stringify(
            error.data,
            null,
            2
          )
        );
      }
    }
  }

  console.log('');

  // ==========================================
  // STATUS
  // ==========================================

  console.log(
    '7. Aplicando status aos agendamentos...'
  );

  for (const agendamento of agendamentos) {
    try {
      if (
        agendamento.nome.includes(
          'confirmado'
        )
      ) {
        if (agendamento.status !== 'confirmado') {
          await alterarAgendamento(
            adminToken,
            agendamento.id,
            'confirmar'
          );

          console.log(
            `✓ Confirmado — ${agendamento.id}`
          );
        }
      }

      if (
        agendamento.nome.includes(
          'concluído'
        )
      ) {
        if (agendamento.status !== 'concluido') {
          if (agendamento.status !== 'confirmado') {
            await alterarAgendamento(
              adminToken,
              agendamento.id,
              'confirmar'
            );
          }

          await alterarAgendamento(
            adminToken,
            agendamento.id,
            'concluir'
          );
        }

        const avaliacao = agendamento.avaliacao || agendamento.avaliacoes?.[0];
        const jaAvaliado = agendamento.nota !== undefined && agendamento.nota !== null || Boolean(avaliacao);
        if (!jaAvaliado) {
          await avaliarAgendamento(
            marinaToken,
            agendamento.id
          );
        }

        console.log(
          `✓ Concluído + avaliação 5 — ${agendamento.id}`
        );
      }

      if (
        agendamento.nome.includes(
          'cancelado'
        )
      ) {
        if (agendamento.status !== 'cancelado') {
          await alterarAgendamento(
            anaToken,
            agendamento.id,
            'cancelar'
          );

          console.log(
            `✓ Cancelado — ${agendamento.id}`
          );
        }
      }
    } catch (error) {
      console.log(
        `✗ Erro no status ${agendamento.id}: ${error.message}`
      );

      if (error.data) {
        console.log(
          JSON.stringify(
            error.data,
            null,
            2
          )
        );
      }
    }
  }

  console.log('');
  console.log('==========================================');
  console.log('          SEED FINALIZADO');
  console.log('==========================================');
  console.log('');
  console.log('PACIENTES PARA TESTE:');
  console.log('');
  console.log(
    'Ana Beatriz'
  );
  console.log(
    'ana.teste@example.com'
  );
  console.log(
    `Senha: ${SENHA_TESTE}`
  );
  console.log('');
  console.log(
    'Lucas Henrique'
  );
  console.log(
    'lucas.teste@example.com'
  );
  console.log(
    `Senha: ${SENHA_TESTE}`
  );
  console.log('');
  console.log(
    'Marina Alves'
  );
  console.log(
    'marina.teste@example.com'
  );
  console.log(
    `Senha: ${SENHA_TESTE}`
  );
  console.log('');
}

function perguntar(texto) {
  return new Promise(resolve => {
    process.stdout.write(texto);

    process.stdin.once(
      'data',
      data => {
        resolve(
          data
            .toString()
            .trim()
        );
      }
    );
  });
}

main().catch(error => {
  console.error('');
  console.error(
    '=========================================='
  );
  console.error(
    'ERRO AO EXECUTAR O SEED'
  );
  console.error(
    '=========================================='
  );
  console.error('');
  console.error(
    error.message
  );

  if (error.data) {
    console.error('');
    console.error(
      'Detalhes da API:'
    );
    console.error(
      JSON.stringify(
        error.data,
        null,
        2
      )
    );
  }

  process.exit(1);
});
