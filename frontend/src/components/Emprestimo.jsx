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

// =============================================================================
// [RESUMO 1 & 4 | RELATÓRIO 3.5 & 4.2.2] TELA DE GESTÃO DE EMPRÉSTIMOS (ADMIN)
// O QUE FAZ: Lista todos os empréstimos e permite registrar empréstimo, devolver
// ou renovar prazos diretamente na mesma tela usando formulário em linha.
// POR QUE ESTÁ AQUI: Ilustra o fluxo completo do Resumo 1 (React -> apiRequest
// -> Routes -> Middlewares -> Controller -> Service -> Repository) e estados React.
// =============================================================================
export default function Emprestimo({ onErro, onSucesso }) {
  // [RESUMO 4] useState ("memória da tela"): guarda a lista vinda da API e os campos do formulário.
  // Sempre que setLista é chamado após criar/devolver/renovar, o React redesenha a tabela sem F5.
  const [lista, setLista] = useState([]);
  const [matricula, setMatricula] = useState('');
  const [tombo, setTombo] = useState('');

  // Carrega todos os empréstimos da API (GET /api/emprestimos) e atualiza o estado da tabela
  async function carregar() {
    try {
      setLista(await apiRequest('/api/emprestimos'));
    } catch (err) {
      onErro(err.message);
    }
  }

  // [RESUMO 4 | RELATÓRIO 4.2.2] Gatilho inicial: roda carregar() uma única vez ao montar o componente
  useEffect(() => {
    carregar();
  }, []);

  // [RESUMO 1] Fluxo de "Registrar Empréstimo":
  // 1) e.preventDefault() impede o navegador de recarregar a página no submit HTML.
  // 2) Envia POST /api/emprestimos via apiRequest (com token JWT) informando matrícula e tombo.
  // 3) Limpa os inputs e chama carregar() para refletir o novo empréstimo na tabela.
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

  // Executa ações de devolver (PUT), renovar (PUT) ou excluir (DELETE) um empréstimo
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
