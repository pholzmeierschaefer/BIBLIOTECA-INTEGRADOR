# Biblioteca HM

Sistema web para gerenciamento de biblioteca escolar (controle de estudantes, acervo de livros, exemplares, empréstimos, reservas e relatórios).

## Tecnologias e Bibliotecas

**Backend (`backend/`):**
- Node.js + Express
- Sequelize + `pg` / `pg-hstore` (PostgreSQL)
- `bcrypt` (hash de senhas)
- `jsonwebtoken` (autenticação JWT)
- `dotenv` e `cors`
- `nodemon` (desenvolvimento)

**Frontend (`frontend/`):**
- React + Vite
- Material UI (`@mui/material`, `@emotion/react`, `@emotion/styled`)

## Como Executar

### 1. Banco de Dados (PostgreSQL)
Crie o banco `biblioteca_hm` no PostgreSQL:
```sql
CREATE DATABASE biblioteca_hm;
```
As tabelas são criadas automaticamente pelo Sequelize ao iniciar o backend. Caso precise criar manualmente via SQL, o script com os comandos `CREATE TABLE` e `INSERT` iniciais está em `backend/database.sql`.

### 2. Backend
No terminal, entre na pasta `backend`, instale as dependências e configure o `.env`:
```bash
cd backend
yarn install
```
Verifique as credenciais do banco no arquivo `backend/src/.env` (use `backend/src/.env.example` como base).

Para popular o banco com dados iniciais de teste e iniciar o servidor:
```bash
yarn seed
yarn dev
```
O backend rodará em `http://localhost:3000`.

### 3. Frontend
Em outro terminal, entre na pasta `frontend`, instale as dependências e inicie o Vite:
```bash
cd frontend
yarn install
yarn dev
```
Acesse no navegador: `http://localhost:5173`.

## Logins de Teste (após `yarn seed`)

- **Admin:** matrícula `admin` | senha `admin123`
- **Estudante:** matrícula `2026001` | senha `2026001`
