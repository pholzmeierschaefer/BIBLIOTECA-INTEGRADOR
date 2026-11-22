// PortalAluno.jsx – Tela do estudante para consultar seus empréstimos, pesquisar livros e fazer reservas

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import MudarSenha from '../components/MudarSenha';
import { apiRequest, formatarData } from '../services/api';

export default function PortalAluno({ usuario, onSair }) {
  const [aba, setAba] = useState('emprestimos');
  const [portal, setPortal] = useState(null);
  const [livros, setLivros] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modalSenha, setModalSenha] = useState(false);

  // Carrega em paralelo os empréstimos do aluno, o acervo de livros e as reservas
  async function carregarDados() {
    try {
      const [meusEmp, listaLivros, listaReservas] = await Promise.all([
        apiRequest('/api/emprestimos/meus'),
        apiRequest('/api/livros'),
        apiRequest('/api/reservas'),
      ]);
      setPortal(meusEmp);
      setLivros(listaLivros);
      setReservas(listaReservas);
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtra o acervo de livros pelo termo digitado na busca
  async function pesquisarLivros(termo) {
    setBusca(termo);
    const lista = await apiRequest(`/api/livros${termo ? `?q=${encodeURIComponent(termo)}` : ''}`);
    setLivros(lista);
  }

  // Registra uma nova reserva para o estudante logado
  async function handleReservar(codigoLivro) {
    try {
      await apiRequest('/api/reservas', {
        method: 'POST',
        body: { livro_codigo: codigoLivro, estudante_matricula: usuario.matricula },
      });
      setSucesso('Reserva realizada com sucesso!');
      carregarDados();
    } catch (err) {
      setErro(err.message);
    }
  }

  // Cancela uma reserva pendente do estudante
  async function handleCancelarReserva(id) {
    try {
      await apiRequest(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
      setSucesso('Reserva cancelada.');
      carregarDados();
    } catch (err) {
      setErro(err.message);
    }
  }

  // Solicita o motivo do atraso e envia a justificativa para o bibliotecário
  async function handleJustificar(emprestimoId) {
    const texto = window.prompt('Digite o motivo do atraso:');
    if (!texto) return;
    try {
      await apiRequest(`/api/emprestimos/${emprestimoId}/justificativa`, {
        method: 'PUT',
        body: { justificativa_atraso: texto },
      });
      setSucesso('Justificativa enviada!');
      carregarDados();
    } catch (err) {
      setErro(err.message);
    }
  }

  const emPosse = portal?.em_posse || [];
  const historico = portal?.historico || [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid #ccc' }}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          Biblioteca HM - Portal do Aluno ({usuario.nome})
        </Typography>
        <Button size="small" variant={aba === 'emprestimos' ? 'contained' : 'outlined'} onClick={() => setAba('emprestimos')}>
          Meus Empréstimos
        </Button>
        <Button size="small" variant={aba === 'livros' ? 'contained' : 'outlined'} onClick={() => setAba('livros')}>
          Acervo de Livros
        </Button>
        <Button size="small" variant={aba === 'reservas' ? 'contained' : 'outlined'} onClick={() => setAba('reservas')}>
          Minhas Reservas
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => setModalSenha(true)}>Mudar Senha</Button>
          <Button size="small" variant="contained" color="error" onClick={onSair}>Sair</Button>
        </Box>
      </Box>

      {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>{erro}</Alert>}
      {sucesso && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSucesso('')}>{sucesso}</Alert>}

      {aba === 'emprestimos' && (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>Livros em Posse ({emPosse.length}/2)</Typography>
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Livro</TableCell>
                <TableCell>Tombo</TableCell>
                <TableCell>Devolução Prevista</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {emPosse.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.exemplar?.livro?.titulo}</TableCell>
                  <TableCell>{emp.exemplar?.codigo_tombo}</TableCell>
                  <TableCell>{formatarData(emp.data_devolucao_prevista)}</TableCell>
                  <TableCell>{emp.atrasado ? `Atrasado (${emp.dias_atraso}d)` : 'No prazo'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleJustificar(emp.id)}>Justificar Atraso</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Typography variant="h6" sx={{ mb: 1 }}>Histórico de Devoluções</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Livro</TableCell>
                <TableCell>Retirada</TableCell>
                <TableCell>Devolução</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historico.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.exemplar?.livro?.titulo}</TableCell>
                  <TableCell>{formatarData(emp.data_emprestimo)}</TableCell>
                  <TableCell>{formatarData(emp.data_devolucao_realizada)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {aba === 'livros' && (
        <Box>
          <TextField
            size="small"
            placeholder="Pesquisar livro..."
            value={busca}
            onChange={(e) => pesquisarLivros(e.target.value)}
            sx={{ mb: 2, width: 300 }}
          />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Autor</TableCell>
                <TableCell>Disponíveis</TableCell>
                <TableCell>Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {livros.map((livro) => (
                <TableRow key={livro.id}>
                  <TableCell>{livro.codigo}</TableCell>
                  <TableCell>{livro.titulo}</TableCell>
                  <TableCell>{livro.autor}</TableCell>
                  <TableCell>{livro.exemplares_disponiveis} / {livro.total_exemplares}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleReservar(livro.codigo)}>Reservar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {aba === 'reservas' && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Livro</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reservas.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.livro?.titulo}</TableCell>
                <TableCell>{formatarData(r.data_reserva)}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>
                  {r.status === 'pendente' && (
                    <Button size="small" color="error" onClick={() => handleCancelarReserva(r.id)}>
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <MudarSenha aberto={modalSenha} onFechar={() => setModalSenha(false)} onSucesso={setSucesso} />
    </Box>
  );
}
