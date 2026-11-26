// =============================================================================
// [RESUMO 1 | RELATÓRIO 2.3a & 4.1a] CLIENTE HTTP CENTRALIZADO DO FRONTEND
// O QUE FAZ: Centraliza todas as chamadas fetch para o backend, anexando
// automaticamente o token JWT e convertendo respostas/erros JSON.
// POR QUE ESTÁ AQUI: Evita repetir headers, URL base, Bearer token e
// tratamento de erro em cada componente React (facilidade destacada em 4.1).
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CHAVE_TOKEN = 'biblioteca_hm_token';

// [RELATÓRIO 3.2] Lê o token JWT armazenado em sessionStorage para autenticar as requisições
export function getToken() {
  return sessionStorage.getItem(CHAVE_TOKEN);
}

// Salva o token JWT no login ou remove no logout (sessionStorage limpa ao fechar a aba)
export function setToken(token) {
  if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
  else sessionStorage.removeItem(CHAVE_TOKEN);
}

// [RESUMO 1 | RELATÓRIO 2.3a] Função principal usada por todas as telas para chamar a API.
// Se existir token no navegador, envia "Authorization: Bearer <token>" para passar pelo middleware autenticar.js.
// Se a API responder com status de erro (!res.ok), lança um Error com a mensagem vinda do erroHandler.js.
export async function apiRequest(caminho, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${caminho}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const dados = await res.json();
  if (!res.ok) throw new Error(dados.erro || 'Erro na requisição.');
  return dados;
}

// Faz download de relatórios em formato CSV
export async function baixarCsv(caminho, nomeArquivo) {
  const token = getToken();
  const res = await fetch(`${API_URL}${caminho}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new Error('Erro ao baixar CSV.');
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
}

// Formata uma data ISO para o padrão brasileiro (DD/MM/AAAA)
export function formatarData(valor) {
  return valor ? new Date(valor).toLocaleDateString('pt-BR') : '-';
}
