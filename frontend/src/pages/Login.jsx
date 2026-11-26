// =============================================================================
// [RESUMO 4 | RELATÓRIO 2.3b & 3.2] TELA DE AUTENTICAÇÃO (ESTUDANTE E ADMIN)
// O QUE FAZ: Recebe matrícula/e-mail e senha, envia para POST /auth/login e
// salva o token JWT retornado no navegador antes de avisar o componente App.
// POR QUE ESTÁ AQUI: Separa o login por perfil (estudante/administrador) e
// valida credenciais via API sem manter sessão no servidor (Stateless JWT).
// =============================================================================

import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { apiRequest, setToken } from '../services/api';

export default function Login({ onLogin }) {
  // [RESUMO 4] useState controla a aba selecionada, os inputs controlados e mensagens de erro
  const [perfil, setPerfil] = useState('estudante'); // Aba selecionada ('estudante' ou 'administrador')
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  // Envia credenciais para a API:
  // - e.preventDefault() evita reload da página ao submeter o <form>.
  // - Salva o JWT via setToken() e passa os dados do usuário para App.jsx exibir o painel correto.
  async function handleEntrar(e) {
    e.preventDefault();
    setErro('');
    try {
      const dados = await apiRequest('/auth/login', {
        method: 'POST',
        body: { matricula: matricula.trim(), senha, perfil },
      });
      setToken(dados.token);
      onLogin(dados.usuario);
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Paper variant="outlined" sx={{ p: 3, width: 320 }}>
        <Typography variant="h6" align="center" sx={{ mb: 2 }}>
          Biblioteca HM - Login
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            fullWidth
            variant={perfil === 'estudante' ? 'contained' : 'outlined'}
            onClick={() => setPerfil('estudante')}
          >
            Estudante
          </Button>
          <Button
            fullWidth
            variant={perfil === 'administrador' ? 'contained' : 'outlined'}
            onClick={() => setPerfil('administrador')}
          >
            Bibliotecário
          </Button>
        </Box>

        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

        <form onSubmit={handleEntrar}>
          <TextField
            label="Matrícula ou E-mail"
            size="small"
            fullWidth
            required
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Senha"
            type="password"
            size="small"
            fullWidth
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" fullWidth>
            Entrar
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
