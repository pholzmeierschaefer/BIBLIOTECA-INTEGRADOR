// Estudante.jsx – Cadastro individual, importação em lote (.xlsx e .csv do SISGESC), listagem e controle de status

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

export default function Estudante({ onErro, onSucesso }) {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [turma, setTurma] = useState('');
  const [telefone, setTelefone] = useState('');

  // Estados do modal de Importação em Lote (.xlsx ou .csv)
  const [modalCsv, setModalCsv] = useState(false);
  const [textoCsv, setTextoCsv] = useState('');
  const [xlsxBase64, setXlsxBase64] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');

  async function carregar(termo = '') {
    try {
      const qs = termo ? `?q=${encodeURIComponent(termo)}` : '';
      setLista(await apiRequest(`/api/estudantes${qs}`));
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCadastrar(e) {
    e.preventDefault();
    try {
      await apiRequest('/api/estudantes', {
        method: 'POST',
        body: { matricula, nome, turma, telefone },
      });
      onSucesso('Estudante cadastrado.');
      setMatricula('');
      setNome('');
      setTurma('');
      setTelefone('');
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  // Lê o arquivo selecionado: se for .xlsx lê em Base64; se for .csv/.txt lê como texto
  function handleSelecionarArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);

    const leitor = new FileReader();
    if (arquivo.name.toLowerCase().endsWith('.xlsx')) {
      leitor.onload = (ev) => {
        setXlsxBase64(String(ev.target.result || ''));
        setTextoCsv('');
      };
      leitor.readAsDataURL(arquivo);
    } else {
      leitor.onload = (ev) => {
        const buffer = ev.target.result;
        let texto = new TextDecoder('utf-8').decode(buffer);
        if (texto.includes('\uFFFD')) {
          texto = new TextDecoder('iso-8859-1').decode(buffer);
        }
        setTextoCsv(texto);
        setXlsxBase64('');
      };
      leitor.readAsArrayBuffer(arquivo);
    }
  }

  // Envia a planilha (.xlsx ou .csv) para a rota POST /api/estudantes/importar
  async function handleImportarLote() {
    try {
      const body = xlsxBase64 ? { xlsx_base64: xlsxBase64 } : { csv: textoCsv };
      await apiRequest('/api/estudantes/importar', {
        method: 'POST',
        body,
      });
      onSucesso('Planilha importada.');
      setTextoCsv('');
      setXlsxBase64('');
      setNomeArquivo('');
      setModalCsv(false);
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleStatus(aluno, novoStatus) {
    try {
      await apiRequest(`/api/estudantes/${encodeURIComponent(aluno.matricula)}/status`, {
        method: 'PUT',
        body: { status: novoStatus },
      });
      onSucesso('Status atualizado.');
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExcluir(aluno) {
    try {
      await apiRequest(`/api/estudantes/${encodeURIComponent(aluno.matricula)}`, {
        method: 'DELETE',
      });
      onSucesso('Estudante excluído.');
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Estudantes</Typography>
        <Button variant="outlined" onClick={() => setModalCsv(true)}>
          Importar Planilha
        </Button>
      </Box>

      {/* Formulário direto em linha para cadastrar estudante */}
      <Paper
        component="form"
        onSubmit={handleCadastrar}
        variant="outlined"
        sx={{ p: 2, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}
      >
        <TextField size="small" label="Matrícula" required value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        <TextField size="small" label="Nome Completo" required value={nome} onChange={(e) => setNome(e.target.value)} />
        <TextField size="small" label="Turma" required value={turma} onChange={(e) => setTurma(e.target.value)} />
        <TextField size="small" label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Button type="submit" variant="contained">Cadastrar</Button>
      </Paper>

      <TextField
        size="small"
        placeholder="Pesquisar estudante..."
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          carregar(e.target.value);
        }}
        sx={{ mb: 2, width: 300 }}
      />

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Matrícula</TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>Turma</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lista.map((aluno) => (
            <TableRow key={aluno.id}>
              <TableCell>{aluno.matricula}</TableCell>
              <TableCell>{aluno.nome}</TableCell>
              <TableCell>{aluno.turma}</TableCell>
              <TableCell>{aluno.telefone || '-'}</TableCell>
              <TableCell>{aluno.status}</TableCell>
              <TableCell>
                {aluno.status !== 'ativo' && (
                  <Button size="small" onClick={() => handleStatus(aluno, 'ativo')}>Ativar</Button>
                )}
                {aluno.status !== 'bloqueado' && (
                  <Button size="small" color="warning" onClick={() => handleStatus(aluno, 'bloqueado')}>Bloquear</Button>
                )}
                {aluno.status !== 'inativo' && (
                  <Button size="small" onClick={() => handleStatus(aluno, 'inativo')}>Inativar</Button>
                )}
                <Button size="small" color="error" onClick={() => handleExcluir(aluno)}>
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal simples para Importação em Lote */}
      <Dialog open={modalCsv} onClose={() => setModalCsv(false)} fullWidth maxWidth="sm">
        <DialogTitle>Importar Planilha</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <input
            type="file"
            accept=".xlsx,.csv,.tsv,.txt"
            onChange={handleSelecionarArquivo}
          />
          {xlsxBase64 ? (
            <Typography variant="body2">
              Arquivo selecionado: {nomeArquivo}
            </Typography>
          ) : (
            <TextField
              multiline
              rows={5}
              size="small"
              placeholder="Ou cole o conteúdo aqui..."
              value={textoCsv}
              onChange={(e) => {
                setTextoCsv(e.target.value);
                setXlsxBase64('');
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCsv(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleImportarLote}
            disabled={!xlsxBase64 && !textoCsv.trim()}
          >
            Importar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
