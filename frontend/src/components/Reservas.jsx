// Reservas.jsx – Fila de espera de reservas de livros

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
  const [lista, setLista] = useState([]);
  const [matricula, setMatricula] = useState('');
  const [codigoLivro, setCodigoLivro] = useState('');

  // Carrega a fila de reservas ordenada por chegada
  async function carregar() {
    try {
      setLista(await apiRequest('/api/reservas'));
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // Cria uma nova reserva vinculando a matrícula do aluno ao código do livro
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
