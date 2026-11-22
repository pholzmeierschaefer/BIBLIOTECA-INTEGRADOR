-- database.sql – Script de criação das tabelas e dados iniciais (PostgreSQL)
-- Banco de dados: biblioteca_hm

-- 1. Tabela de Estudantes (Leitores)
CREATE TABLE IF NOT EXISTS estudantes (
  id SERIAL PRIMARY KEY,
  matricula VARCHAR(30) NOT NULL UNIQUE,
  nome_completo VARCHAR(150) NOT NULL,
  turma VARCHAR(50) NOT NULL,
  telefone VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Usuários (Autenticação e Autorização: 'bibliotecario' e 'aluno')
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  matricula VARCHAR(50) UNIQUE,
  email VARCHAR(150) UNIQUE,
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'aluno',
  estudante_id INTEGER UNIQUE REFERENCES estudantes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Tipos de Livro
CREATE TABLE IF NOT EXISTS tipos_livro (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descricao VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Tabela de Categorias Literárias
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Tabela de Livros (Acervo)
CREATE TABLE IF NOT EXISTS livros (
  id SERIAL PRIMARY KEY,
  codigo_livro VARCHAR(50) UNIQUE,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150) NOT NULL,
  editora VARCHAR(120),
  ano_publicacao INTEGER,
  tipo VARCHAR(100),
  tipo_livro_id INTEGER REFERENCES tipos_livro(id) ON DELETE SET NULL,
  categoria VARCHAR(100),
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Tabela de Exemplares Físicos (Tombos)
CREATE TABLE IF NOT EXISTS exemplares (
  id SERIAL PRIMARY KEY,
  codigo_exemplar VARCHAR(50) UNIQUE,
  livro_id INTEGER REFERENCES livros(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Tabela de Empréstimos
CREATE TABLE IF NOT EXISTS emprestimos (
  id SERIAL PRIMARY KEY,
  exemplar_id INTEGER NOT NULL REFERENCES exemplares(id) ON DELETE CASCADE,
  estudante_id INTEGER NOT NULL REFERENCES estudantes(id) ON DELETE CASCADE,
  data_emprestimo TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_devolucao_prevista TIMESTAMP WITH TIME ZONE NOT NULL,
  data_devolucao_realizada TIMESTAMP WITH TIME ZONE,
  renovacoes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Tabela de Reservas
CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  estudante_id INTEGER NOT NULL REFERENCES estudantes(id) ON DELETE CASCADE,
  livro_id INTEGER REFERENCES livros(id) ON DELETE CASCADE,
  exemplar_id INTEGER REFERENCES exemplares(id) ON DELETE SET NULL,
  data_reserva TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  alerta_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Tabela de Justificativas de Atraso
CREATE TABLE IF NOT EXISTS justificativas (
  id SERIAL PRIMARY KEY,
  emprestimo_id INTEGER NOT NULL REFERENCES emprestimos(id) ON DELETE CASCADE,
  estudante_id INTEGER NOT NULL REFERENCES estudantes(id) ON DELETE CASCADE,
  texto_descritivo TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- DADOS INICIAIS PARA OPERAÇÃO DO PROJETO
-- =====================================================================

INSERT INTO tipos_livro (codigo, descricao) VALUES
  ('LITERATURA', 'Literatura'),
  ('DIDATICO', 'Didático')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO categorias (codigo, nome) VALUES
  ('ROMANCE', 'Romance'),
  ('FANTASIA', 'Fantasia'),
  ('HISTORIA', 'História')
ON CONFLICT (codigo) DO NOTHING;
