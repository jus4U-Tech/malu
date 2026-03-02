# 🎂 BBB da Malu — Setup Guide

Bolão de aniversário com Next.js, Prisma, PostgreSQL (dev) e Supabase (prod).

---

## 🚀 Quick Start — Desenvolvimento Local

### 1. Clone e instale
```bash
git clone https://github.com/SEU_USUARIO/bbb-da-malu.git
cd bbb-da-malu
npm install
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 3. Suba o PostgreSQL com Docker
```bash
npm run db:up
# Verifica se subiu:
docker ps | grep bbb_malu
```

### 4. Rode as migrations Prisma
```bash
npm run db:migrate
# Acesse o Adminer em http://localhost:8080
# System: PostgreSQL | Server: postgres | User: postgres | Password: postgres | Database: bbb_malu
```

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
# App: http://localhost:3000
# Prisma Studio: npm run db:studio → http://localhost:5555
```

---

## ⚡ Deploy — Supabase + Vercel

### 1. Crie o projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) → New Project
2. Anote: **Project URL**, **Anon Key**, **Service Role Key**
3. Em **Storage** → crie um bucket público chamado `fotos`

### 2. Configure variáveis na Vercel
No painel da Vercel → Settings → Environment Variables:
```
DATABASE_URL              → Connection string do Supabase (Transaction Pooler porta 6543)
DIRECT_URL                → Connection string direta (porta 5432) — para migrations
NEXT_PUBLIC_SUPABASE_URL  → https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY → eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY → eyJhbGci...
ANTHROPIC_API_KEY         → sk-ant-...
```

### 3. Configure os GitHub Secrets
No repositório → Settings → Secrets → Actions:
```
VERCEL_TOKEN
VERCEL_PROJECT_ID
VERCEL_ORG_ID
DATABASE_URL        (URL do Supabase para migrations)
```

### 4. Push para main — deploy automático
```bash
git add .
git commit -m "feat: initial deploy"
git push origin main
# GitHub Actions faz o deploy automaticamente na Vercel
```

---

## 🗄️ Schema do Banco

```
Participante
  id        String  (cuid)
  nome      String
  palpite   String? (MM/AA — imutável após definido)
  fotos     Foto[]
  createdAt DateTime
  updatedAt DateTime

Foto
  id             String
  participanteId String (FK → Participante)
  url            String (URL no Supabase Storage ou base64 em dev)
  original       Boolean (true = original, false = tratada pela IA)
  ordem          Int
  createdAt      DateTime

Config
  id       String ("singleton")
  prdFotos String? (instruções de tratamento de fotos)
```

---

## 🧑‍💻 Scripts úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run db:up` | Sobe PostgreSQL + Adminer no Docker |
| `npm run db:down` | Para os containers |
| `npm run db:migrate` | Cria/aplica migrations (dev) |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:reset` | Reseta o banco local completamente |
| `npm run build` | Build de produção |
| `npm run type-check` | Verifica tipos TypeScript |

---

## 🗂️ Estrutura do Projeto

```
bbb-da-malu/
├── .github/workflows/deploy.yml   # CI/CD GitHub Actions → Vercel
├── prisma/
│   ├── schema.prisma              # Modelo de dados (Prisma)
│   └── seed.ts                    # Dados iniciais (opcional)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── participantes/
│   │   │   │   ├── route.ts       # GET (list) + POST (create)
│   │   │   │   └── [id]/route.ts  # GET + PATCH + DELETE
│   │   │   └── config/route.ts    # GET + PATCH config
│   │   └── page.tsx               # Frontend (o Artifact React)
│   └── lib/
│       ├── prisma.ts              # Singleton do Prisma Client
│       └── supabase.ts            # Client Supabase + upload de fotos
├── docker-compose.yml             # PostgreSQL + Adminer (dev)
├── .env.example                   # Template de variáveis
└── package.json
```
