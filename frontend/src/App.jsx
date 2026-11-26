// =============================================================================
// [RESUMO 4 | RELATÓRIO 2.3b & 4.2.2] COMPONENTE RAIZ E ROTEAMENTO POR PERFIL
// O QUE FAZ: Verifica se há sessão ativa no carregamento inicial e decide qual
// tela renderizar: Login, DashAdmin (bibliotecário) ou PortalAluno (estudante).
// POR QUE ESTÁ AQUI: Mantém o controle de fluxo de acesso centralizado sem
// precisar de rotas complexas antes da autenticação.
// =============================================================================

import { useEffect, useState } from 'react';
import { apiRequest, getToken, setToken } from './services/api';
import Login from './pages/Login';
import DashAdmin from './pages/DashAdmin';
import PortalAluno from './pages/PortalAluno';

export default function App() {
  // [RESUMO 4] useState guarda o usuário autenticado e o estado de carregamento inicial
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // [RESUMO 4 | RELATÓRIO 4.2.2] useEffect com array [] executa uma única vez ao abrir a página.
  // Se houver token JWT no sessionStorage, valida-o em /auth/perfil para restaurar a sessão após F5.
  useEffect(() => {
    if (!getToken()) {
      setCarregando(false);
      return;
    }

    // Busca os dados do usuário logado na API usando o token salvo; se inválido/expirado, limpa o token.
    apiRequest('/auth/perfil')
      .then((perfil) => setUsuario(perfil))
      .catch(() => setToken(null))
      .finally(() => setCarregando(false));
  }, []);

  // Remove o token da sessão e volta para a tela de login
  function sair() {
    setToken(null);
    setUsuario(null);
  }

  if (carregando) return <p style={{ padding: 20 }}>Carregando...</p>;
  if (!usuario) return <Login onLogin={setUsuario} />;
  if (usuario.role === 'bibliotecario') return <DashAdmin usuario={usuario} onSair={sair} />; // Se for admin, abre o painel administrativo

  return <PortalAluno usuario={usuario} onSair={sair} />; // Caso contrário, abre o portal do estudante
}
