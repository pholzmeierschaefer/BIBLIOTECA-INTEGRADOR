// MudarSenha.jsx – Modal simples para alteração de senha do usuário logado

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { apiRequest } from '../services/api';

export default function MudarSenha({ aberto, onFechar, onSucesso }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');

  // Envia a senha atual e a nova senha para a rota PUT /auth/senha
  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    try {
      await apiRequest('/auth/senha', {
        method: 'PUT',
        body: { senha_atual: senhaAtual, nova_senha: novaSenha },
      });
      setSenhaAtual('');
      setNovaSenha('');
      if (onSucesso) onSucesso('Senha alterada com sucesso!');
      onFechar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <Dialog open={aberto} onClose={onFechar} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Mudar Senha</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}
          <TextField
            label="Senha atual"
            type="password"
            size="small"
            required
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
          />
          <TextField
            label="Nova senha (mín. 4 caracteres)"
            type="password"
            size="small"
            required
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button type="submit" variant="contained">Salvar</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
