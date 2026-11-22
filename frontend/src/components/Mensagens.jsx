// Mensagens.jsx – Listagem de justificativas de atraso enviadas pelos estudantes

import { useEffect, useState } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { apiRequest, formatarData } from '../services/api';

export default function Mensagens({ onErro, onSucesso }) {
  const [lista, setLista] = useState([]);

  async function carregar() {
    try {
      setLista(await apiRequest('/api/emprestimos/justificativas'));
    } catch (err) {
      onErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleAnalisar(id) {
    try {
      await apiRequest(`/api/emprestimos/justificativas/${id}/analisar`, { method: 'PUT' });
      onSucesso('Justificativa marcada como analisada.');
      carregar();
    } catch (err) {
      onErro(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Justificativas de Atraso</Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Aluno</TableCell>
            <TableCell>Livro</TableCell>
            <TableCell>Justificativa</TableCell>
            <TableCell>Ação</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lista.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{formatarData(item.data_envio)}</TableCell>
              <TableCell>{item.estudante?.nome} ({item.estudante?.matricula})</TableCell>
              <TableCell>{item.livro?.titulo || '-'}</TableCell>
              <TableCell>{item.texto_descritivo}</TableCell>
              <TableCell>
                {item.status === 'pendente' ? (
                  <Button size="small" color="success" onClick={() => handleAnalisar(item.id)}>
                    Marcar Analisada
                  </Button>
                ) : (
                  'Analisada'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
