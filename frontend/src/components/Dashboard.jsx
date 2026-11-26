// Dashboard.jsx – Resumo de indicadores da biblioteca, exportação CSV e lista de atrasos

import { useEffect, useState } from 'react';
import { Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { apiRequest, baixarCsv, formatarData } from '../services/api';

// =============================================================================
// [RESUMO 3 & 4 | RELATÓRIO 1 & 4.2.2] PAINEL ANALÍTICO (DASHBOARD + CSV)
// O QUE FAZ: Exibe contadores gerais da biblioteca, lista de empréstimos em
// atraso e botões para baixar relatórios CSV (acervo, empréstimos e alunos).
// POR QUE ESTÁ AQUI: Dá visão rápida ao bibliotecário carregando indicadores em paralelo.
// =============================================================================
export default function Dashboard({ onErro, onSucesso }) {
  // [RESUMO 4] useState armazena os dados do dashboard e totais de alunos/livros para renderização reativa
  const [dashboard, setDashboard] = useState(null);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalLivros, setTotalLivros] = useState(0);

  // Busca em paralelo (/dashboard, /estudantes e /livros) com Promise.all para reduzir tempo de espera
  async function carregar() {
    try {
      const [dash, alunos, livros] = await Promise.all([
        apiRequest('/api/emprestimos/dashboard'),
        apiRequest('/api/estudantes'),
        apiRequest('/api/livros'),
      ]);
      setDashboard(dash);
      setTotalAlunos(alunos.length);
      setTotalLivros(livros.length);
    } catch (err) {
      onErro(err.message);
    }
  }

  // [RESUMO 4 | RELATÓRIO 4.2.2] Carrega os indicadores uma única vez ao abrir a tela inicial do painel
  useEffect(() => {
    carregar();
  }, []);

  // Registra a devolução rápida de um livro atrasado direto pelo Dashboard
  async function handleDevolver(id) {
    try {
      await apiRequest(`/api/emprestimos/${id}/devolver`, { method: 'PUT' });
      onSucesso('Livro devolvido.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  const ind = dashboard?.indicadores || {};
  const atrasos = dashboard?.atrasos_gerais || [];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Dashboard</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button size="small" variant="outlined" onClick={() => baixarCsv('/api/relatorios/livros-mais-lidos?formato=csv', 'livros-mais-lidos.csv')}>
          Livros Mais Lidos
        </Button>
        <Button size="small" variant="outlined" onClick={() => baixarCsv('/api/relatorios/frequencia-turmas?formato=csv', 'frequencia-turmas.csv')}>
          Frequência por Turma
        </Button>
        <Button size="small" variant="outlined" onClick={() => baixarCsv('/api/relatorios/taxas-atraso?formato=csv', 'taxas-atraso.csv')}>
          Taxas de Atraso
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>Alunos: <b>{totalAlunos}</b></Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>Livros: <b>{totalLivros}</b></Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>Empréstimos Ativos: <b>{ind.total_emprestimos_ativos || 0}</b></Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>Atrasados: <b>{ind.total_atrasos || 0}</b></Paper>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>Empréstimos em Atraso</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Estudante</TableCell>
            <TableCell>Livro / Tombo</TableCell>
            <TableCell>Previsto</TableCell>
            <TableCell>Dias de Atraso</TableCell>
            <TableCell>Ação</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {atrasos.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>{emp.estudante?.nome} ({emp.estudante?.matricula})</TableCell>
              <TableCell>{emp.exemplar?.livro?.titulo} ({emp.exemplar?.codigo_tombo})</TableCell>
              <TableCell>{formatarData(emp.data_devolucao_prevista)}</TableCell>
              <TableCell>{emp.dias_atraso} dias</TableCell>
              <TableCell>
                <Button size="small" variant="contained" onClick={() => handleDevolver(emp.id)}>
                  Devolver
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
