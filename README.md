# Mobility API

Mobility é uma API REST desenvolvida em Node.js com NestJS e PostgreSQL para auxiliar pessoas com deficiência (PCD) a planejarem trajetos acessíveis nas cidades brasileiras, verificando pontos inacessíveis e sugerindo alternativas de acordo com o tipo de deficiência do usuário.

## Tecnologias

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- OpenRouteService API
- OpenStreetMap (Nominatim)

## Instalação
```bash
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=sua_senha
DATABASE_NAME=Mobility
ORS_API_KEY=sua_chave
GOOGLE_API_KEY=sua_chave
HUGGING_FACE_API_KEY=seu_token
```

## Rodando o projeto
```bash
npm run start:dev
```

## Rotas

### Usuários
- `POST /usuarios` — cadastrar usuário
- `GET /usuarios/:id` — buscar usuário por id

### Locais
- `POST /locais` — cadastrar local
- `GET /locais` — listar todos os locais
- `GET /locais/:id` — buscar local por id
- `PUT /locais/:id` — atualizar local

### Avaliações
- `POST /avaliacoes` — criar avaliação
- `GET /avaliacoes/local/:localId` — ver avaliações de um local

### Rotas
- `POST /rotas/verificar` — verificar se um trajeto é acessível
- `GET /rotas/:id` — buscar rota por id
- `GET /rotas/historico/:userId` — histórico de rotas do usuário
