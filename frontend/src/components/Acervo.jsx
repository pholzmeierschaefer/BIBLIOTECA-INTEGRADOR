// Acervo.jsx – Cadastro, edição, ordenação, filtro por categoria e exclusão de Livros e Exemplares

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
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

export default function Acervo({ onErro, onSucesso }) {
  const [livros, setLivros] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [ordenacao, setOrdenacao] = useState('titulo');

  // Campos do formulário (criação e edição)
  const [editandoId, setEditandoId] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [editora, setEditora] = useState('');
  const [tipo, setTipo] = useState('Literatura');
  const [categoria, setCategoria] = useState('Romance');

  async function carregar(termo = busca, cat = filtroCategoria) {
    try {
      const params = new URLSearchParams();
      if (termo) params.set('q', termo);
      if (cat) params.set('categoria', cat);
      const qs = params.toString() ? `?${params.toString()}` : '';
      setLivros(await apiRequest(`/api/livros${qs}`));
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function limparFormulario() {
    setEditandoId(null);
    setCodigo('');
    setTitulo('');
    setAutor('');
    setEditora('');
    setTipo('Literatura');
    setCategoria('Romance');
  }

  function iniciarEdicao(livro) {
    setEditandoId(livro.id);
    setCodigo(livro.codigo);
    setTitulo(livro.titulo);
    setAutor(livro.autor);
    setEditora(livro.editora || '');
    setTipo(livro.tipo || 'Literatura');
    setCategoria(livro.categoria || 'Romance');
  }

  async function handleSalvarLivro(e) {
    e.preventDefault();
    try {
      const body = { codigo, titulo, autor, editora, tipo, categoria };
      if (editandoId) {
        await apiRequest(`/api/livros/${editandoId}`, { method: 'PUT', body });
        onSucesso('Livro atualizado.');
      } else {
        await apiRequest('/api/livros', { method: 'POST', body });
        onSucesso('Livro cadastrado.');
      }
      limparFormulario();
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleAdicionarExemplar(livro) {
    const tombo = window.prompt('Código de tombo:');
    if (!tombo) return;
    try {
      await apiRequest(`/api/livros/${encodeURIComponent(livro.codigo)}/exemplares`, {
        method: 'POST',
        body: { codigo_tombo: tombo.trim() },
      });
      onSucesso('Exemplar adicionado.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExcluirLivro(livro) {
    try {
      await apiRequest(`/api/livros/${livro.id}`, { method: 'DELETE' });
      onSucesso('Livro excluído.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  // Ordena a lista pelo campo escolhido (título, autor ou código)
  const livrosOrdenados = [...livros].sort((a, b) => {
    if (ordenacao === 'autor') return (a.autor || '').localeCompare(b.autor || '');
    if (ordenacao === 'codigo') return (a.codigo || '').localeCompare(b.codigo || '');
    return (a.titulo || '').localeCompare(b.titulo || '');
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Livros e Exemplares</Typography>

      {/* Formulário simples para cadastrar ou editar livro */}
      <Paper
        component="form"
        onSubmit={handleSalvarLivro}
        variant="outlined"
        sx={{ p: 2, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}
      >
        <TextField size="small" label="Código" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <TextField size="small" label="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <TextField size="small" label="Autor" required value={autor} onChange={(e) => setAutor(e.target.value)} />
        <TextField size="small" label="Editora" value={editora} onChange={(e) => setEditora(e.target.value)} />
        <TextField size="small" label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} />
        <TextField size="small" label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <Button type="submit" variant="contained">
          {editandoId ? 'Salvar' : 'Cadastrar'}
        </Button>
        {editandoId && (
          <Button variant="outlined" onClick={limparFormulario}>
            Cancelar
          </Button>
        )}
      </Paper>

      {/* Barra de busca textual, filtro por categoria e ordenação */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Pesquisar título, autor ou código..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            carregar(e.target.value, filtroCategoria);
          }}
          sx={{ width: 260 }}
        />
        <TextField
          size="small"
          placeholder="Filtrar categoria..."
          value={filtroCategoria}
          onChange={(e) => {
            setFiltroCategoria(e.target.value);
            carregar(busca, e.target.value);
          }}
          sx={{ width: 180 }}
        />
        <TextField
          select
          size="small"
          label="Ordenar por"
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value)}
          sx={{ width: 160 }}
        >
          <MenuItem value="titulo">Título</MenuItem>
          <MenuItem value="autor">Autor</MenuItem>
          <MenuItem value="codigo">Código</MenuItem>
        </TextField>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Código</TableCell>
            <TableCell>Título</TableCell>
            <TableCell>Autor</TableCell>
            <TableCell>Tipo / Categoria</TableCell>
            <TableCell>Disponíveis / Total</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {livrosOrdenados.map((livro) => (
            <TableRow key={livro.id}>
              <TableCell>{livro.codigo}</TableCell>
              <TableCell>{livro.titulo}</TableCell>
              <TableCell>{livro.autor}</TableCell>
              <TableCell>{livro.tipo || '-'} / {livro.categoria || '-'}</TableCell>
              <TableCell>{livro.exemplares_disponiveis} / {livro.total_exemplares}</TableCell>
              <TableCell>
                <Button size="small" onClick={() => iniciarEdicao(livro)}>
                  Editar
                </Button>
                <Button size="small" onClick={() => handleAdicionarExemplar(livro)}>
                  + Exemplar
                </Button>
                <Button size="small" color="error" onClick={() => handleExcluirLivro(livro)}>
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
