// api.js – Funções auxiliares para fazer requisições HTTP ao backend enviando o token JWT

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CHAVE_TOKEN = 'biblioteca_hm_token';

// Lê o token JWT salvo no navegador
export function getToken() {
  return sessionStorage.getItem(CHAVE_TOKEN);
}

// Salva ou remove o token JWT do navegador
export function setToken(token) {
  if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
  else sessionStorage.removeItem(CHAVE_TOKEN);
}

// Faz chamadas fetch para a API já incluindo o cabeçalho Authorization: Bearer <token>
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
