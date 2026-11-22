// Login.jsx – Tela simples de login para Estudante e Administrador

import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { apiRequest, setToken } from '../services/api';

export default function Login({ onLogin }) {
  const [perfil, setPerfil] = useState('estudante'); // Aba selecionada ('estudante' ou 'administrador')
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  // Envia as credenciais para a API, salva o token JWT retornado e atualiza o usuário no App
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
            Admin
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
