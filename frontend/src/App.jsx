// App.jsx – Verifica se o usuário está logado e direciona para Login, Painel Admin ou Portal do Aluno

import { useEffect, useState } from 'react';
import { apiRequest, getToken, setToken } from './services/api';
import Login from './pages/Login';
import DashAdmin from './pages/DashAdmin';
import PortalAluno from './pages/PortalAluno';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Ao abrir o site, verifica se já existe um token salvo na sessão
  useEffect(() => {
    if (!getToken()) {
      setCarregando(false);
      return;
    }

    apiRequest('/auth/perfil')
      .then((perfil) => setUsuario(perfil))
      .catch(() => setToken(null))
      .finally(() => setCarregando(false));
  }, []);

  function sair() {
    setToken(null);
    setUsuario(null);
  }

  if (carregando) return <p style={{ padding: 20 }}>Carregando...</p>;
  if (!usuario) return <Login onLogin={setUsuario} />;
  if (usuario.role === 'bibliotecario') return <DashAdmin usuario={usuario} onSair={sair} />;

  return <PortalAluno usuario={usuario} onSair={sair} />;
}
