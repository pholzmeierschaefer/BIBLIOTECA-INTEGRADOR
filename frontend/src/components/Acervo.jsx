// Acervo.jsx – Cadastro e listagem de Livros e de seus Exemplares físicos (tombos)

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

export default function Acervo({ onErro, onSucesso }) {
  const [livros, setLivros] = useState([]);
  const [busca, setBusca] = useState('');
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [editora, setEditora] = useState('');
  const [tipo, setTipo] = useState('Literatura');
  const [categoria, setCategoria] = useState('Romance');

  async function carregar(termo = '') {
    try {
      const qs = termo ? `?q=${encodeURIComponent(termo)}` : '';
      setLivros(await apiRequest(`/api/livros${qs}`));
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriarLivro(e) {
    e.preventDefault();
    try {
      await apiRequest('/api/livros', {
        method: 'POST',
        body: { codigo, titulo, autor, editora, tipo, categoria },
      });
      onSucesso('Livro cadastrado!');
      setCodigo('');
      setTitulo('');
      setAutor('');
      setEditora('');
      carregar(busca);
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
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  async function handleExcluirLivro(livro) {
    try {
      await apiRequest(`/api/livros/${livro.id}`, { method: 'DELETE' });
      onSucesso('Livro excluído.');
      carregar(busca);
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Acervo de Livros e Exemplares</Typography>

      {/* Formulário simples em linha para cadastrar um novo livro */}
      <Paper
        component="form"
        onSubmit={handleCriarLivro}
        variant="outlined"
        sx={{ p: 2, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}
      >
        <TextField size="small" label="Código" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <TextField size="small" label="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <TextField size="small" label="Autor" required value={autor} onChange={(e) => setAutor(e.target.value)} />
        <TextField size="small" label="Editora" value={editora} onChange={(e) => setEditora(e.target.value)} />
        <TextField size="small" label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} />
        <TextField size="small" label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <Button type="submit" variant="contained">Cadastrar Livro</Button>
      </Paper>

      <TextField
        size="small"
        placeholder="Pesquisar livro..."
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
            <TableCell>Código</TableCell>
            <TableCell>Título</TableCell>
            <TableCell>Autor</TableCell>
            <TableCell>Tipo / Categoria</TableCell>
            <TableCell>Disponíveis / Total</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {livros.map((livro) => (
            <TableRow key={livro.id}>
              <TableCell>{livro.codigo}</TableCell>
              <TableCell>{livro.titulo}</TableCell>
              <TableCell>{livro.autor}</TableCell>
              <TableCell>{livro.tipo || '-'} / {livro.categoria || '-'}</TableCell>
              <TableCell>{livro.exemplares_disponiveis} / {livro.total_exemplares}</TableCell>
              <TableCell>
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
