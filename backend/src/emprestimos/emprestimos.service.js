// emprestimos.service.js – Camada Service (Cérebro e Regras de Negócio) de Empréstimos, Devoluções, Renovações, Justificativas e Dashboard
// [RESUMO 1 - Service | RESUMO 2 - Transações | RESUMO 3 - Regras de Negócio Críticas | RELATÓRIO 2.1c & 4.2.3]

const emprestimosRepository = require('./emprestimos.repository');

// [RESUMO 3] Constantes de regras da biblioteca definidas no topo para facilitar leitura e manutenção
const PRAZO_PADRAO_DIAS = 7; // Prazo padrão de 7 dias corridos por empréstimo ou renovação
const LIMITE_EMPRESTIMOS_SIMULTANEOS = 2; // Máximo de 2 livros emprestados por aluno ao mesmo tempo
const LIMITE_ATRASO_CRITICO_DIAS = 10; // Atrasos acima de 10 dias recebem alerta crítico no dashboard
const MS_POR_DIA = 1000* 60 * 60 * 24; // Quantidade de milissegundos em 1 dia (usado no cálculo de atraso)
          //ms=1seg //60s=1m //60m=1h //24h = 1d
          //==86400000ms

          
// [RELATÓRIO 4.2.3] Função auxiliar para criar erros de negócio com código HTTP (400, 403, 404, 409)
// O erroHandler.js lê err.statusCode para responder o status HTTP certo sem expor detalhes internos
function criarErroHttp(statusCode, mensagem) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  return err;
}

// Soma uma quantidade de dias a uma data (usado para calcular +7 dias no empréstimo e na renovação)
function adicionarDias(dataBase, dias) {
  const novaData = new Date(dataBase);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

// Calcula quantos dias corridos se passaram desde a data prevista de devolução.
// Como .getTime() retorna datas em milissegundos, dividimos a diferença por MS_POR_DIA para converter em dias:
// - Math.floor(...) pega apenas os dias inteiros;
// - Math.max(1, ...) garante que, se já venceu (mesmo por algumas horas), conte ao menos 1 dia de atraso.
function calcularDiasAtraso(dataPrevista, referencia = new Date()) {
  const diffMs = referencia.getTime() - new Date(dataPrevista).getTime();
  return diffMs > 0 ? Math.max(1, Math.floor(diffMs / MS_POR_DIA)) : 0;
}

// Padroniza o objeto JSON que vai para o frontend (já calcula status em tempo real, dias_atraso e critico)
function formatarEmprestimo(emprestimo, referencia = new Date()) {
  const emAberto = emprestimo.data_devolucao_realizada === null;
  const diasAtraso = emAberto ? calcularDiasAtraso(emprestimo.data_devolucao_prevista, referencia) : 0;
  const atrasado = emAberto && diasAtraso > 0;
  const livroObj = emprestimo.exemplar?.livro;
  const justificativas = (emprestimo.justificativas || []).map((j) => ({
    id: j.id,
    texto_descritivo: j.texto_descritivo,
    data_envio: j.data_envio,
    status: j.status,
  }));

  return {
    id: emprestimo.id,
    data_emprestimo: emprestimo.data_emprestimo,
    data_devolucao_prevista: emprestimo.data_devolucao_prevista,
    data_devolucao_realizada: emprestimo.data_devolucao_realizada,
    renovacoes: emprestimo.renovacoes,
    status: emAberto ? (atrasado ? 'atrasado' : 'ativo') : 'devolvido',
    atrasado,
    dias_atraso: diasAtraso,
    critico: atrasado && diasAtraso > LIMITE_ATRASO_CRITICO_DIAS,
    estudante: emprestimo.estudante
      ? {
          id: emprestimo.estudante.id,
          matricula: emprestimo.estudante.matricula,
          nome: emprestimo.estudante.nome_completo,
          turma: emprestimo.estudante.turma,
          status: emprestimo.estudante.status,
        }
      : null,
    exemplar: emprestimo.exemplar
      ? {
          id: emprestimo.exemplar.id,
          codigo_tombo: emprestimo.exemplar.codigo_exemplar,
          status: emprestimo.exemplar.status,
          livro: livroObj
            ? {
                id: livroObj.id,
                codigo: livroObj.codigo_livro,
                titulo: livroObj.titulo,
                autor: livroObj.autor,
              }
            : null,
        }
      : null,
    justificativa_atraso: justificativas[0]?.texto_descritivo || null,
    justificativas,
  };
}

// 1. REGISTRAR EMPRÉSTIMO
// [RESUMO 1 - Fluxo | RESUMO 2 - Transação | RESUMO 3 - Regras de Negócio | RELATÓRIO 3.4 & 4.2.3]
async function registrarEmprestimo({ estudante_matricula, exemplar_tombo }) {
  const agora = new Date();
  const estudante = await emprestimosRepository.buscarEstudantePorMatricula(estudante_matricula);
  if (!estudante) throw criarErroHttp(404, 'Estudante não encontrado.');

  // [RESUMO 3] Varre o banco antes de emprestar: se houver livro vencido, marca como 'atrasado' e bloqueia o aluno
  await emprestimosRepository.sincronizarAtrasos({ estudanteId: estudante.id, referencia: agora });
  await estudante.reload(); // Recarrega do banco caso sincronizarAtrasos tenha mudado o status para 'bloqueado'

  // Regra: aluno 'bloqueado' ou 'inativo' não pode pegar novos livros
  if (estudante.status !== 'ativo') {
    throw criarErroHttp(409, `Empréstimo bloqueado: o estudante está com status "${estudante.status}".`);
  }

  // [RESUMO 3] Limite de 2 empréstimos simultâneos: conta registros onde data_devolucao_realizada é null
  const ativos = await emprestimosRepository.contarEmprestimosAtivosDoEstudante(estudante.id);
  if (ativos >= LIMITE_EMPRESTIMOS_SIMULTANEOS) {
    throw criarErroHttp(409, `Limite atingido: o estudante já possui ${LIMITE_EMPRESTIMOS_SIMULTANEOS} livros emprestados.`);
  }

  // Busca o exemplar físico pelo tombo e confere se está livre na estante
  const exemplar = await emprestimosRepository.buscarExemplarPorTombo(exemplar_tombo);
  if (!exemplar) throw criarErroHttp(404, 'Exemplar não encontrado.');

  if (exemplar.status !== 'disponivel') {
    throw criarErroHttp(409, `Este exemplar não está disponível (status atual: "${exemplar.status}").`);
  }

  // [RESUMO 2 & RELATÓRIO 3.4] CONTROLE DE TRANSAÇÃO (Atomicidade):
  // Aqui mexemos em DUAS tabelas ao mesmo tempo: 'emprestimos' (INSERT) e 'exemplares' (UPDATE).
  // Se o servidor cair ou der erro entre as duas gravações, a transação faz ROLLBACK automático de tudo!
  const emprestimoCriado = await emprestimosRepository.executarTransacao(async (transaction) => {
    const novo = await emprestimosRepository.criarEmprestimo(
      {
        exemplar_id: exemplar.id,
        estudante_id: estudante.id,
        data_emprestimo: agora,
        data_devolucao_prevista: adicionarDias(agora, PRAZO_PADRAO_DIAS), // Prazo = hoje + 7 dias
        data_devolucao_realizada: null, // Null indica que o livro ainda está com o aluno
        renovacoes: 0,
        status: 'ativo',
      },
      transaction
    );

    // Muda o exemplar físico para 'emprestado' dentro da mesma transação
    await emprestimosRepository.atualizarExemplar(exemplar, { status: 'emprestado' }, transaction);
    return emprestimosRepository.buscarEmprestimoPorId(novo.id, transaction);
  });

  return formatarEmprestimo(emprestimoCriado, agora);
}

// 2. REGISTRAR DEVOLUÇÃO (aceita ID do empréstimo ou código de tombo do exemplar)
// [RESUMO 2 - Transação] Atualiza 3 tabelas na mesma transação: 'emprestimos', 'exemplares' e (se preciso) 'estudantes'
async function registrarDevolucao({ emprestimoId, exemplarTombo }) {
  const agora = new Date();

  const resultado = await emprestimosRepository.executarTransacao(async (transaction) => {
    const emprestimo = emprestimoId
      ? await emprestimosRepository.buscarEmprestimoPorId(emprestimoId, transaction)
      : await emprestimosRepository.buscarEmprestimoAtivoPorTombo(exemplarTombo, transaction);

    if (!emprestimo) throw criarErroHttp(404, 'Empréstimo ativo não encontrado para devolução.');
    if (emprestimo.data_devolucao_realizada !== null) {
      throw criarErroHttp(409, 'Este empréstimo já foi devolvido.');
    }

    // 1) Registra a data real da devolução e muda status do empréstimo para 'devolvido'
    await emprestimosRepository.atualizarEmprestimo(
      emprestimo,
      { data_devolucao_realizada: agora, status: 'devolvido' },
      transaction
    );
    // 2) Libera a cópia física na estante de volta para 'disponivel'
    await emprestimosRepository.atualizarExemplar(emprestimo.exemplar, { status: 'disponivel' }, transaction);

    // 3) Desbloqueio automático: se o aluno estava bloqueado por atraso e não tem nenhum outro livro atrasado, volta para 'ativo'
    let estudanteDesbloqueado = false;
    if (emprestimo.estudante?.status === 'bloqueado') {
      const outrosAtrasos = await emprestimosRepository.contarEmprestimosAtrasadosDoEstudante(
        emprestimo.estudante.id,
        agora,
        emprestimo.id,
        transaction
      );
      if (outrosAtrasos === 0) {
        await emprestimosRepository.atualizarEstudante(emprestimo.estudante, { status: 'ativo' }, transaction);
        estudanteDesbloqueado = true;
      }
    }

    const atualizado = await emprestimosRepository.buscarEmprestimoPorId(emprestimo.id, transaction);
    return { atualizado, estudanteDesbloqueado };
  });

  return {
    mensagem: 'Devolução registrada com sucesso. Exemplar disponível na estante.',
    estudante_desbloqueado: resultado.estudanteDesbloqueado,
    emprestimo: formatarEmprestimo(resultado.atualizado, agora),
  };
}

// 3. REGISTRAR RENOVAÇÃO (+7 dias corridos sobre a data prevista atual)
// Só permite renovar se o livro ainda não foi devolvido, não está atrasado e o aluno está 'ativo'
async function registrarRenovacao(emprestimoId) {
  const agora = new Date();
  const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId);
  if (!emprestimo) throw criarErroHttp(404, 'Empréstimo não encontrado.');

  if (emprestimo.data_devolucao_realizada !== null) {
    throw criarErroHttp(409, 'Não é possível renovar um empréstimo já devolvido.');
  }

  if (new Date(emprestimo.data_devolucao_prevista) < agora) {
    throw criarErroHttp(409, 'Renovação bloqueada: este empréstimo já está em atraso.');
  }

  if (emprestimo.estudante?.status !== 'ativo') {
    throw criarErroHttp(409, 'Renovação bloqueada: estudante com status bloqueado ou inativo.');
  }

  const novaDataPrevista = adicionarDias(emprestimo.data_devolucao_prevista, PRAZO_PADRAO_DIAS);
  await emprestimosRepository.atualizarEmprestimo(emprestimo, {
    data_devolucao_prevista: novaDataPrevista,
    renovacoes: emprestimo.renovacoes + 1,
  });

  return formatarEmprestimo(emprestimo, agora);
}

// 4. LISTAR EMPRÉSTIMOS (com sincronização automática de atrasos antes de devolver a lista)
async function listarEmprestimos(filtros = {}) {
  const agora = new Date();
  await emprestimosRepository.sincronizarAtrasos({ referencia: agora });

  const emprestimos = await emprestimosRepository.listarEmprestimos({
    status: filtros.status,
    estudanteMatricula: filtros.estudante_matricula || filtros.matricula,
    exemplarTombo: filtros.exemplar_tombo || filtros.tombo,
    apenasAtivos: filtros.apenas_ativos === 'true' || filtros.apenas_ativos === true,
  });

  return emprestimos.map((emp) => formatarEmprestimo(emp, agora));
}

// 5. DASHBOARD GERENCIAL (usado por Dashboard.jsx no frontend)
// Sincroniza atrasos e devolve totais em tempo real de ativos, atrasados e atrasos críticos (> 10 dias)
async function obterDashboard() {
  const agora = new Date();
  await emprestimosRepository.sincronizarAtrasos({ referencia: agora });

  const ativos = await emprestimosRepository.listarEmprestimos({ apenasAtivos: true });
  const formatados = ativos.map((emp) => formatarEmprestimo(emp, agora));

  const atrasosGerais = formatados.filter((emp) => emp.atrasado);
  const atrasosCriticos = atrasosGerais.filter((emp) => emp.critico);

  return {
    gerado_em: agora.toISOString(),
    indicadores: {
      total_emprestimos_ativos: formatados.length,
      total_atrasos: atrasosGerais.length,
      total_atrasos_criticos: atrasosCriticos.length,
    },
    atrasos_criticos: atrasosCriticos,
    atrasos_gerais: atrasosGerais,
  };
}

// 6. PORTAL DO ALUNO: separa o que o estudante tem em mãos ('em_posse') do que já devolveu ('historico')
async function listarMeusEmprestimos(usuarioAutenticado, matriculaFiltro = null) {
  let estudante = null;

  if (usuarioAutenticado?.estudante_id) {
    estudante = await emprestimosRepository.buscarEstudantePorId(usuarioAutenticado.estudante_id);
  } else if (matriculaFiltro) {
    estudante = await emprestimosRepository.buscarEstudantePorMatricula(matriculaFiltro);
  } else {
    throw criarErroHttp(400, 'Informe o parâmetro ?matricula= para consultar os empréstimos do estudante.');
  }

  if (!estudante) throw criarErroHttp(404, 'Estudante não encontrado.');

  const emprestimos = await emprestimosRepository.listarEmprestimos({ estudanteId: estudante.id });
  const formatados = emprestimos.map((emp) => formatarEmprestimo(emp));

  return {
    estudante: {
      id: estudante.id,
      matricula: estudante.matricula,
      nome: estudante.nome_completo,
      turma: estudante.turma,
      status: estudante.status,
    },
    em_posse: formatados.filter((emp) => emp.data_devolucao_realizada === null),
    historico: formatados.filter((emp) => emp.data_devolucao_realizada !== null),
  };
}

// 7. BUSCAR POR ID
async function buscarEmprestimoPorId(emprestimoId) {
  const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId);
  if (!emprestimo) throw criarErroHttp(404, 'Empréstimo não encontrado.');
  return formatarEmprestimo(emprestimo);
}

// 8. EDITAR EMPRÉSTIMO (permite ajustes administrativos em datas, renovações ou status)
async function editarEmprestimo(emprestimoId, dados) {
  const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId);
  if (!emprestimo) throw criarErroHttp(404, 'Empréstimo não encontrado.');

  const novaPrevista = dados.data_devolucao_prevista ?? dados.data_prevista;
  const novaDevolucao = dados.data_devolucao_realizada ?? dados.data_devolucao;

  await emprestimosRepository.atualizarEmprestimo(emprestimo, {
    ...(novaPrevista !== undefined && { data_devolucao_prevista: new Date(novaPrevista) }),
    ...(novaDevolucao !== undefined && {
      data_devolucao_realizada: novaDevolucao ? new Date(novaDevolucao) : null,
    }),
    ...(dados.renovacoes !== undefined && { renovacoes: Number(dados.renovacoes) }),
    ...(dados.status !== undefined && { status: String(dados.status).trim().toLowerCase() }),
  });

  const atualizado = await emprestimosRepository.buscarEmprestimoPorId(emprestimo.id);
  return formatarEmprestimo(atualizado);
}

// 9. EXCLUIR EMPRÉSTIMO (dentro de transação: se ainda estava aberto, volta o exemplar para 'disponivel')
async function excluirEmprestimo(emprestimoId) {
  await emprestimosRepository.executarTransacao(async (transaction) => {
    const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId, transaction);
    if (!emprestimo) throw criarErroHttp(404, 'Empréstimo não encontrado.');

    if (emprestimo.data_devolucao_realizada === null && emprestimo.exemplar) {
      await emprestimosRepository.atualizarExemplar(
        emprestimo.exemplar,
        { status: 'disponivel' },
        transaction
      );
    }

    await emprestimosRepository.excluirEmprestimo(emprestimo.id, transaction);
  });
}

// --- Regras de Negócio: Justificativas de Atraso ---

// 10. Registra justificativa enviada pelo aluno no Portal do Aluno (exige no mínimo 5 caracteres)
async function enviarJustificativaAtraso(emprestimoId, textoJustificativa) {
  const textoLimpo = String(textoJustificativa || '').trim();
  if (textoLimpo.length < 5) {
    throw criarErroHttp(400, 'A justificativa de atraso deve conter ao menos 5 caracteres.');
  }

  const emprestimo = await emprestimosRepository.buscarEmprestimoPorId(emprestimoId);
  if (!emprestimo) throw criarErroHttp(404, 'Empréstimo não encontrado.');

  const justificativa = await emprestimosRepository.criarJustificativa({
    emprestimo_id: emprestimo.id,
    estudante_id: emprestimo.estudante_id,
    texto_descritivo: textoLimpo,
    data_envio: new Date(),
    status: 'pendente',
  });

  const atualizado = await emprestimosRepository.buscarEmprestimoPorId(emprestimo.id);
  return {
    mensagem: 'Justificativa de atraso registrada com sucesso.',
    justificativa,
    emprestimo: formatarEmprestimo(atualizado),
  };
}

// 11. Lista todas as justificativas enviadas pelos alunos para a tela Mensagens.jsx do bibliotecário
async function listarJustificativas() {
  const lista = await emprestimosRepository.listarJustificativas();
  return lista.map((item) => {
    const livroObj = item.emprestimo?.exemplar?.livro;
    return {
      id: item.id,
      emprestimo_id: item.emprestimo_id,
      texto_descritivo: item.texto_descritivo,
      data_envio: item.data_envio,
      status: item.status,
      estudante: item.estudante
        ? {
            id: item.estudante.id,
            matricula: item.estudante.matricula,
            nome: item.estudante.nome_completo,
            turma: item.estudante.turma,
          }
        : null,
      livro: livroObj
        ? {
            codigo: livroObj.codigo_livro,
            titulo: livroObj.titulo,
            exemplar_tombo: item.emprestimo.exemplar.codigo_exemplar,
          }
        : null,
    };
  });
}

// 12. Marca uma justificativa pendente como 'analisada' pelo bibliotecário
async function marcarJustificativaAnalisada(justificativaId) {
  const justificativa = await emprestimosRepository.buscarJustificativaPorId(justificativaId);
  if (!justificativa) throw criarErroHttp(404, 'Justificativa não encontrada.');

  await emprestimosRepository.atualizarJustificativa(justificativa, { status: 'analisada' });
  return { mensagem: 'Justificativa marcada como analisada.', justificativa };
}

module.exports = {
  listarEmprestimos,
  buscarEmprestimoPorId,
  registrarEmprestimo,
  editarEmprestimo,
  excluirEmprestimo,
  registrarDevolucao,
  registrarRenovacao,
  obterDashboard,
  listarMeusEmprestimos,
  enviarJustificativaAtraso,
  listarJustificativas,
  marcarJustificativaAnalisada,
};
