// reservas.service.js – Regras de negócio para a fila de Reservas de Livros
// [RESUMO 3 - Regras de Negócio Críticas | RELATÓRIO 2.1c]
// Gerencia a fila de espera por livro no padrão FIFO (First In, First Out: quem reservou primeiro tem prioridade).

const reservasRepository = require('./reservas.repository');

const STATUS_RESERVA_VALIDOS = ['pendente', 'aguardando_retirada', 'atendida', 'cancelada'];

// Cria um erro padronizado com statusCode HTTP (400, 403, 404, 409) para o erroHandler capturar
function criarErroHttp(statusCode, mensagem) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  return err;
}

// Formata os dados da reserva para resposta JSON (incluindo estudante, livro, exemplar e posição na fila)
function formatarReserva(reserva, posicaoFila = null) {
  return {
    id: reserva.id,
    status: reserva.status,
    data_reserva: reserva.data_reserva,
    alerta_enviado: reserva.alerta_enviado,
    ...(posicaoFila !== null && { posicao_fila: posicaoFila }),
    estudante: reserva.estudante
      ? {
          id: reserva.estudante.id,
          matricula: reserva.estudante.matricula,
          nome: reserva.estudante.nome_completo,
          turma: reserva.estudante.turma,
          status: reserva.estudante.status,
        }
      : null,
    livro: reserva.livro
      ? {
          id: reserva.livro.id,
          codigo: reserva.livro.codigo_livro,
          titulo: reserva.livro.titulo,
          autor: reserva.livro.autor,
        }
      : null,
    exemplar: reserva.exemplar
      ? {
          id: reserva.exemplar.id,
          codigo_tombo: reserva.exemplar.codigo_exemplar,
          status: reserva.exemplar.status,
        }
      : null,
  };
}

// 1. CRIAR RESERVA na fila de espera de um livro
// [RESUMO 3] Valida se o estudante está ativo, sem atrasos, se já não está com o livro e se não reservou duas vezes
async function criarReserva({ estudante_matricula, livro_codigo }) {
  const estudante = await reservasRepository.buscarEstudantePorMatricula(estudante_matricula);
  if (!estudante) throw criarErroHttp(404, 'Estudante não encontrado.');

  if (estudante.status !== 'ativo') {
    throw criarErroHttp(409, `Reserva bloqueada: o estudante está com status "${estudante.status}".`);
  }

  const atrasos = await reservasRepository.contarEmprestimosAtrasadosDoEstudante(estudante.id);
  if (atrasos > 0) {
    throw criarErroHttp(409, 'Reserva bloqueada: o estudante possui livro(s) em atraso.');
  }

  const livro = await reservasRepository.buscarLivroPorCodigoOuId(livro_codigo);
  if (!livro) throw criarErroHttp(404, 'Livro não encontrado.');

  // [RESUMO 3] Impede que o aluno reserve um livro que já está com ele emprestado em casa
  if (await reservasRepository.buscarEmprestimoAtivoDoLivroPeloEstudante(estudante.id, livro.id)) {
    throw criarErroHttp(409, 'O estudante já possui um exemplar deste livro emprestado no momento.');
  }

  // [RESUMO 3] Impede que o aluno entre duas vezes na fila do mesmo livro
  if (await reservasRepository.buscarReservaAtivaDoEstudanteNoLivro(estudante.id, livro.id)) {
    throw criarErroHttp(409, 'O estudante já possui uma reserva ativa na fila para este livro.');
  }

  const nova = await reservasRepository.criarReserva({
    estudante_id: estudante.id,
    livro_id: livro.id,
    exemplar_id: null, // Só é preenchido quando um exemplar for separado para retirada
    data_reserva: new Date(),
    status: 'pendente',
    alerta_enviado: false,
  });

  // Calcula em que posição da fila (1º, 2º, 3º...) o aluno acabou de entrar
  const posicao = await reservasRepository.contarReservasPendentesDoLivro(livro.id);
  const completa = await reservasRepository.buscarReservaPorId(nova.id);
  return formatarReserva(completa, posicao);
}

// 2. LISTAR RESERVAS na ordem FIFO (mais antigas primeiro) e calcular a posição de cada aluno pendente por livro
async function listarReservas(filtros = {}) {
  const reservas = await reservasRepository.listarReservas({
    status: filtros.status,
    livroCodigo: filtros.livro_codigo || filtros.obra_codigo || filtros.codigo_livro,
    estudanteMatricula: filtros.estudante_matricula || filtros.matricula,
  });

  // Usa um Map para contar separadamente a fila (1, 2, 3...) de cada livro
  const contadorPorLivro = new Map();
  return reservas.map((reserva) => {
    let posicao = null;
    if (reserva.status === 'pendente') {
      const atual = (contadorPorLivro.get(reserva.livro_id) || 0) + 1;
      contadorPorLivro.set(reserva.livro_id, atual);
      posicao = atual;
    }
    return formatarReserva(reserva, posicao);
  });
}

// 3. BUSCAR RESERVA POR ID
async function buscarReservaPorId(reservaId) {
  const reserva = await reservasRepository.buscarReservaPorId(reservaId);
  if (!reserva) throw criarErroHttp(404, 'Reserva não encontrada.');
  return formatarReserva(reserva);
}

// 4. EDITAR RESERVA (atualiza status ou alerta_enviado)
async function editarReserva(reservaId, dados) {
  const reserva = await reservasRepository.buscarReservaPorId(reservaId);
  if (!reserva) throw criarErroHttp(404, 'Reserva não encontrada.');

  if (dados.status && !STATUS_RESERVA_VALIDOS.includes(String(dados.status).trim().toLowerCase())) {
    throw criarErroHttp(400, `Status inválido. Permitidos: ${STATUS_RESERVA_VALIDOS.join(', ')}.`);
  }

  await reservasRepository.atualizarReserva(reserva, {
    ...(dados.status !== undefined && { status: String(dados.status).trim().toLowerCase() }),
    ...(dados.alerta_enviado !== undefined && { alerta_enviado: Boolean(dados.alerta_enviado) }),
  });

  const atualizada = await reservasRepository.buscarReservaPorId(reserva.id);
  return formatarReserva(atualizada);
}

// [RESUMO 3] Função auxiliar compartilhada por cancelarReserva e excluirReserva:
// Se uma reserva cancelada/excluída estava 'aguardando_retirada' com um exemplar físico separado para ela,
// verifica se há um próximo aluno na fila FIFO: se houver, já segura o exemplar para ele; senão, devolve para 'disponivel' na estante.
async function liberarExemplarRetidoSeNecessario(reserva, transaction) {
  if (reserva.status !== 'aguardando_retirada' || !reserva.exemplar_id) return;

  const exemplar = await reservasRepository.buscarExemplarPorId(reserva.exemplar_id, transaction);
  if (!exemplar || exemplar.status !== 'reservado') return;

  const proxima = await reservasRepository.buscarProximaReservaPendente(reserva.livro_id, transaction);
  if (proxima && proxima.id !== reserva.id) {
    await reservasRepository.atualizarReserva(
      proxima,
      { status: 'aguardando_retirada', exemplar_id: exemplar.id, alerta_enviado: true },
      transaction
    );
  } else {
    await reservasRepository.atualizarExemplar(exemplar, { status: 'disponivel' }, transaction);
  }
}

// 5. CANCELAR RESERVA (dentro de transação para repassar ou liberar exemplar retido com segurança)
async function cancelarReserva(reservaId) {
  const reservaCancelada = await reservasRepository.executarTransacao(async (transaction) => {
    const reserva = await reservasRepository.buscarReservaPorId(reservaId, transaction);
    if (!reserva) throw criarErroHttp(404, 'Reserva não encontrada.');

    if (reserva.status === 'atendida' || reserva.status === 'cancelada') {
      throw criarErroHttp(409, `Não é possível cancelar uma reserva com status "${reserva.status}".`);
    }

    await liberarExemplarRetidoSeNecessario(reserva, transaction);
    await reservasRepository.atualizarReserva(reserva, { status: 'cancelada' }, transaction);
    return reservasRepository.buscarReservaPorId(reserva.id, transaction);
  });

  return { reserva: formatarReserva(reservaCancelada) };
}

// 6. EXCLUIR RESERVA (dentro de transação para liberar eventual exemplar retido antes de apagar)
async function excluirReserva(reservaId) {
  await reservasRepository.executarTransacao(async (transaction) => {
    const reserva = await reservasRepository.buscarReservaPorId(reservaId, transaction);
    if (!reserva) throw criarErroHttp(404, 'Reserva não encontrada.');

    await liberarExemplarRetidoSeNecessario(reserva, transaction);
    await reservasRepository.excluirReserva(reserva, transaction);
  });
}

module.exports = {
  STATUS_RESERVA_VALIDOS,
  formatarReserva,
  criarReserva,
  listarReservas,
  buscarReservaPorId,
  editarReserva,
  cancelarReserva,
  excluirReserva,
};
