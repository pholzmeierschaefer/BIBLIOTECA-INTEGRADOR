// Estudante.jsx – Cadastro, edição, importação em lote (.xlsx/.csv), ordenação, filtro e exclusão de Estudantes

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordenacao, setOrdenacao] = useState('nome');

  // Campos do formulário (criação e edição)
  const [editandoMatricula, setEditandoMatricula] = useState(null);
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [turma, setTurma] = useState('');
  const [telefone, setTelefone] = useState('');

  // Estados do modal de Importação em Lote (.xlsx ou .csv)
  const [modalCsv, setModalCsv] = useState(false);
  const [textoCsv, setTextoCsv] = useState('');
  const [xlsxBase64, setXlsxBase64] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');

  // Busca a lista de estudantes na API aplicando os filtros de pesquisa e status
  async function carregar(termo = busca, status = filtroStatus) {
    try {
      const params = new URLSearchParams();
      if (termo) params.set('q', termo);
      if (status) params.set('status', status);
      const qs = params.toString() ? `?${params.toString()}` : '';
      setLista(await apiRequest(`/api/estudantes${qs}`));
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // Reseta os campos do formulário e sai do modo de edição
  function limparFormulario() {
    setEditandoMatricula(null);
    setMatricula('');
    setNome('');
    setTurma('');
    setTelefone('');
  }

  // Preenche o formulário do topo com os dados do estudante selecionado para edição
  function iniciarEdicao(aluno) {
    setEditandoMatricula(aluno.matricula);
    setMatricula(aluno.matricula);
    setNome(aluno.nome);
    setTurma(aluno.turma);
    setTelefone(aluno.telefone || '');
  }

  // Salva um novo estudante (POST) ou atualiza um estudante existente (PUT)
  async function handleSalvar(e) {
    e.preventDefault();
    try {
      if (editandoMatricula) {
        await apiRequest(`/api/estudantes/${encodeURIComponent(editandoMatricula)}`, {
          method: 'PUT',
          body: { matricula, nome, turma, telefone },
        });
        onSucesso('Estudante atualizado.');
      } else {
        await apiRequest('/api/estudantes', {
          method: 'POST',
          body: { matricula, nome, turma, telefone },
        });
        onSucesso('Estudante cadastrado.');
      }
      limparFormulario();
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  // Lê o arquivo selecionado no computador (.xlsx em Base64 ou .csv/.txt como texto)
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

  // Envia a planilha (.xlsx ou .csv) para importação em lote no backend
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
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  // Altera rapidamente o status do estudante ('ativo', 'bloqueado' ou 'inativo')
  async function handleStatus(aluno, novoStatus) {
    try {
      await apiRequest(`/api/estudantes/${encodeURIComponent(aluno.matricula)}/status`, {
        method: 'PUT',
        body: { status: novoStatus },
      });
      onSucesso('Status atualizado.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  // Exclui definitivamente o estudante do banco de dados
  async function handleExcluir(aluno) {
    try {
      await apiRequest(`/api/estudantes/${encodeURIComponent(aluno.matricula)}`, {
        method: 'DELETE',
      });
      onSucesso('Estudante excluído.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  // Ordena a lista pelo campo selecionado (nome, turma ou matrícula)
  const listaOrdenada = [...lista].sort((a, b) => {
    if (ordenacao === 'turma') return (a.turma || '').localeCompare(b.turma || '');
    if (ordenacao === 'matricula') return (a.matricula || '').localeCompare(b.matricula || '');
    return (a.nome || '').localeCompare(b.nome || '');
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Estudantes</Typography>
        <Button variant="outlined" onClick={() => setModalCsv(true)}>
          Importar Planilha
        </Button>
      </Box>

      {/* Formulário para cadastrar ou editar estudante */}
      <Paper
        component="form"
        onSubmit={handleSalvar}
        variant="outlined"
        sx={{ p: 2, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}
      >
        <TextField size="small" label="Matrícula" required value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        <TextField size="small" label="Nome Completo" required value={nome} onChange={(e) => setNome(e.target.value)} />
        <TextField size="small" label="Turma" required value={turma} onChange={(e) => setTurma(e.target.value)} />
        <TextField size="small" label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Button type="submit" variant="contained">
          {editandoMatricula ? 'Salvar' : 'Cadastrar'}
        </Button>
        {editandoMatricula && (
          <Button variant="outlined" onClick={limparFormulario}>
            Cancelar
          </Button>
        )}
      </Paper>

      {/* Barra de busca, filtro por status e ordenação */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Pesquisar estudante..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            carregar(e.target.value, filtroStatus);
          }}
          sx={{ width: 260 }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={filtroStatus}
          onChange={(e) => {
            setFiltroStatus(e.target.value);
            carregar(busca, e.target.value);
          }}
          sx={{ width: 150 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="ativo">Ativo</MenuItem>
          <MenuItem value="bloqueado">Bloqueado</MenuItem>
          <MenuItem value="inativo">Inativo</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Ordenar por"
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value)}
          sx={{ width: 160 }}
        >
          <MenuItem value="nome">Nome</MenuItem>
          <MenuItem value="turma">Turma</MenuItem>
          <MenuItem value="matricula">Matrícula</MenuItem>
        </TextField>
      </Box>

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
          {listaOrdenada.map((aluno) => (
            <TableRow key={aluno.id}>
              <TableCell>{aluno.matricula}</TableCell>
              <TableCell>{aluno.nome}</TableCell>
              <TableCell>{aluno.turma}</TableCell>
              <TableCell>{aluno.telefone || '-'}</TableCell>
              <TableCell>{aluno.status}</TableCell>
              <TableCell>
                <Button size="small" onClick={() => iniciarEdicao(aluno)}>Editar</Button>
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
