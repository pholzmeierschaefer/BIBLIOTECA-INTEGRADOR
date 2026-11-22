// DashAdmin.jsx – Painel principal do Bibliotecário com menu de navegação simples

import { useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import MudarSenha from '../components/MudarSenha';
import Dashboard from '../components/Dashboard';
import Estudante from '../components/Estudante';
import Acervo from '../components/Acervo';
import Emprestimo from '../components/Emprestimo';
import Reservas from '../components/Reservas';
import Mensagens from '../components/Mensagens';

const ABAS = [
  { id: 'dashboard', nome: 'Dashboard' },
  { id: 'estudantes', nome: 'Estudantes' },
  { id: 'acervo', nome: 'Livros & Exemplares' },
  { id: 'emprestimos', nome: 'Empréstimos' },
  { id: 'reservas', nome: 'Reservas' },
  { id: 'mensagens', nome: 'Justificativas' },
];

export default function DashAdmin({ usuario, onSair }) {
  const [tela, setTela] = useState('dashboard');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modalSenha, setModalSenha] = useState(false);

  return (
    <Box sx={{ p: 3 }}>
      {/* Barra de topo simples com os botões das abas */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid #ccc' }}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          Biblioteca HM ({usuario.nome})
        </Typography>

        {ABAS.map((aba) => (
          <Button
            key={aba.id}
            size="small"
            variant={tela === aba.id ? 'contained' : 'outlined'}
            onClick={() => {
              setErro('');
              setSucesso('');
              setTela(aba.id);
            }}
          >
            {aba.nome}
          </Button>
        ))}

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => setModalSenha(true)}>
            Mudar Senha
          </Button>
          <Button size="small" variant="contained" color="error" onClick={onSair}>
            Sair
          </Button>
        </Box>
      </Box>

      {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>{erro}</Alert>}
      {sucesso && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSucesso('')}>{sucesso}</Alert>}

      {tela === 'dashboard' && <Dashboard onErro={setErro} onSucesso={setSucesso} />}
      {tela === 'estudantes' && <Estudante onErro={setErro} onSucesso={setSucesso} />}
      {tela === 'acervo' && <Acervo onErro={setErro} onSucesso={setSucesso} />}
      {tela === 'emprestimos' && <Emprestimo onErro={setErro} onSucesso={setSucesso} />}
      {tela === 'reservas' && <Reservas onErro={setErro} onSucesso={setSucesso} />}
      {tela === 'mensagens' && <Mensagens onErro={setErro} onSucesso={setSucesso} />}

      <MudarSenha aberto={modalSenha} onFechar={() => setModalSenha(false)} onSucesso={setSucesso} />
    </Box>
  );
}
