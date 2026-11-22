// main.jsx – Ponto de entrada do React com as cores do tema da Biblioteca HM

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';

// Tema com as cores da Biblioteca HM (tons pêssego e marrom escuro para alto contraste e leitura fácil)
const tema = createTheme({
  palette: {
    primary: { main: '#ffdab9', dark: '#f4c095', contrastText: '#3e2723' },
    secondary: { main: '#8d6e63', contrastText: '#ffffff' },
    error: { main: '#d32f2f' },
    background: { default: '#fffaf5' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        // Garante que todos os botões sem fundo preenchido (outlined e text) tenham letra e borda escuras bem visíveis
        outlined: {
          color: '#3e2723',
          borderColor: '#c89b7b',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: '#ffe8d6',
            borderColor: '#8d6e63',
          },
        },
        text: {
          color: '#3e2723',
          fontWeight: 600,
        },
        containedPrimary: {
          fontWeight: 700,
        },
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
