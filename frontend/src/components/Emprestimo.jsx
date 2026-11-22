// Emprestimo.jsx – Registro, listagem, devolução e renovação de Empréstimos

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
import { apiRequest, formatarData } from '../services/api';

export default function Emprestimo({ onErro, onSucesso }) {
  const [lista, setLista] = useState([]);
  const [matricula, setMatricula] = useState('');
  const [tombo, setTombo] = useState('');

  async function carregar() {
    try {
      setLista(await apiRequest('/api/emprestimos'));
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriar(e) {
    e.preventDefault();
    try {
      await apiRequest('/api/emprestimos', {
        method: 'POST',
        body: { estudante_matricula: matricula.trim(), exemplar_tombo: tombo.trim() },
      });
      onSucesso('Empréstimo registrado com sucesso!');
      setMatricula('');
      setTombo('');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleAcao(url, metodo, msg) {
    try {
      await apiRequest(url, { method: metodo });
      onSucesso(msg);
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Controle de Empréstimos</Typography>

      <Paper
        component="form"
        onSubmit={handleCriar}
        variant="outlined"
        sx={{ p: 2, mb: 3, display: 'flex', gap: 1 }}
      >
        <TextField size="small" label="Matrícula do Aluno" required value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        <TextField size="small" label="Tombo do Exemplar" required value={tombo} onChange={(e) => setTombo(e.target.value)} />
        <Button type="submit" variant="contained">Registrar Empréstimo</Button>
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Aluno</TableCell>
            <TableCell>Livro / Tombo</TableCell>
            <TableCell>Prazo</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lista.map((emp) => {
            const aberto = emp.data_devolucao_realizada === null;
            return (
              <TableRow key={emp.id}>
                <TableCell>{emp.estudante?.nome} ({emp.estudante?.matricula})</TableCell>
                <TableCell>{emp.exemplar?.livro?.titulo} ({emp.exemplar?.codigo_tombo})</TableCell>
                <TableCell>{formatarData(emp.data_devolucao_prevista)}</TableCell>
                <TableCell>{emp.status}</TableCell>
                <TableCell>
                  {aberto && (
                    <>
                      <Button size="small" color="success" onClick={() => handleAcao(`/api/emprestimos/${emp.id}/devolver`, 'PUT', 'Livro devolvido.')}>
                        Devolver
                      </Button>
                      <Button size="small" onClick={() => handleAcao(`/api/emprestimos/${emp.id}/renovar`, 'PUT', 'Empréstimo renovado.')}>
                        Renovar
                      </Button>
                    </>
                  )}
                  <Button size="small" color="error" onClick={() => handleAcao(`/api/emprestimos/${emp.id}`, 'DELETE', 'Empréstimo excluído.')}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
