// reservas.service.js – Regras de negócio para a fila de Reservas de Livros

const reservasRepository = require('./reservas.repository');

const STATUS_RESERVA_VALIDOS = ['pendente', 'aguardando_retirada', 'atendida', 'cancelada'];

// Cria um erro padronizado com statusCode HTTP (400, 403, 404, 409)
function criarErroHttp(statusCode, mensagem) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  return err;
}

// Formata os dados da reserva para resposta JSON (incluindo estudante, livro e exemplar)
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

// 1. Cria uma nova reserva na fila de espera de um livro
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

  // Impede reservar um livro que o próprio estudante já está com ele emprestado
  if (await reservasRepository.buscarEmprestimoAtivoDoLivroPeloEstudante(estudante.id, livro.id)) {
    throw criarErroHttp(409, 'O estudante já possui um exemplar deste livro emprestado no momento.');
  }

  // Impede criar duas reservas ativas do mesmo aluno para o mesmo livro
  if (await reservasRepository.buscarReservaAtivaDoEstudanteNoLivro(estudante.id, livro.id)) {
    throw criarErroHttp(409, 'O estudante já possui uma reserva ativa na fila para este livro.');
  }

  const nova = await reservasRepository.criarReserva({
    estudante_id: estudante.id,
    livro_id: livro.id,
    exemplar_id: null,
    data_reserva: new Date(),
    status: 'pendente',
    alerta_enviado: false,
  });

  const posicao = await reservasRepository.contarReservasPendentesDoLivro(livro.id);
  const completa = await reservasRepository.buscarReservaPorId(nova.id);
  return formatarReserva(completa, posicao);
}

// 2. Lista a fila de reservas por ordem de chegada (FIFO) e calcula a posição de cada aluno na fila
async function listarReservas(filtros = {}) {
  const reservas = await reservasRepository.listarReservas({
    status: filtros.status,
    livroCodigo: filtros.livro_codigo || filtros.obra_codigo || filtros.codigo_livro,
    estudanteMatricula: filtros.estudante_matricula || filtros.matricula,
  });

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

// 3. Busca os detalhes de uma reserva pelo ID
async function buscarReservaPorId(reservaId) {
  const reserva = await reservasRepository.buscarReservaPorId(reservaId);
  if (!reserva) throw criarErroHttp(404, 'Reserva não encontrada.');
  return formatarReserva(reserva);
}

// 4. Atualiza o status ou flag de alerta_enviado de uma reserva
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

// Função auxiliar: se uma reserva cancelada/excluída tinha um exemplar separado para ela,
// repassa o exemplar para o próximo aluno da fila ou devolve para 'disponivel' na estante
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

// 5. Cancela uma reserva ativa
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

// 6. Exclui uma reserva do banco
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
