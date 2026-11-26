// =============================================================================
// [RESUMO 3 & 4 | RELATÓRIO 3.5 & 4.2.2] TELA DE FILA DE RESERVAS (ADMIN)
// O QUE FAZ: Exibe a fila de espera FIFO de reservas e permite registrar novas
// reservas por formulário em linha, cancelar pendentes ou excluir registros.
// POR QUE ESTÁ AQUI: Consome reservas.service.js mantendo a interface direta.
// =============================================================================

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { apiRequest } from '../services/api';

export default function Reservas({ onErro, onSucesso }) {
  // [RESUMO 4] Estados React da tabela e dos campos do formulário em linha
  const [lista, setLista] = useState([]);
  const [matricula, setMatricula] = useState('');
  const [codigoLivro, setCodigoLivro] = useState('');

  // Carrega a fila de reservas (GET /api/reservas) ordenada por ordem de chegada (FIFO)
  async function carregar() {
    try {
      setLista(await apiRequest('/api/reservas'));
    } catch (err) {
      onErro(err.message);
    }
  }

  // [RESUMO 4 | RELATÓRIO 4.2.2] Dispara a busca inicial assim que a aba Reservas é aberta
  useEffect(() => {
    carregar();
  }, []);

  // Registra uma nova reserva sem recarregar a página (e.preventDefault()) e atualiza a lista
  async function handleCriar(e) {
    e.preventDefault();
    try {
      await apiRequest('/api/reservas', {
        method: 'POST',
        body: { estudante_matricula: matricula.trim(), livro_codigo: codigoLivro.trim() },
      });
      onSucesso('Reserva registrada!');
      setMatricula('');
      setCodigoLivro('');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  // Cancela uma reserva pendente na fila
  async function handleCancelar(id) {
    try {
      await apiRequest(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
      onSucesso('Reserva cancelada.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  // Exclui o registro da reserva do banco de dados
  async function handleExcluir(id) {
    try {
      await apiRequest(`/api/reservas/${id}`, { method: 'DELETE' });
      onSucesso('Reserva excluída.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Fila de Reservas</Typography>

      <Paper
        component="form"
        onSubmit={handleCriar}
        variant="outlined"
        sx={{ p: 2, mb: 3, display: 'flex', gap: 1 }}
      >
        <TextField size="small" label="Matrícula do Aluno" required value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        <TextField size="small" label="Código do Livro" required value={codigoLivro} onChange={(e) => setCodigoLivro(e.target.value)} />
        <Button type="submit" variant="contained">Criar Reserva</Button>
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Aluno</TableCell>
            <TableCell>Livro</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lista.map((res) => (
            <TableRow key={res.id}>
              <TableCell>{res.estudante?.nome} ({res.estudante?.matricula})</TableCell>
              <TableCell>{res.livro?.titulo}</TableCell>
              <TableCell>{res.status}</TableCell>
              <TableCell>
                {res.status === 'pendente' && (
                  <Button size="small" color="warning" onClick={() => handleCancelar(res.id)}>
                    Cancelar
                  </Button>
                )}
                <Button size="small" color="error" onClick={() => handleExcluir(res.id)}>
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
