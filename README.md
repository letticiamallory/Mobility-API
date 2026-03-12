# 🦽 Mobility
 
API REST que ajuda PCDs a encontrarem trajetos urbanos seguros e acessíveis. O sistema analisa rotas em tempo real usando Street View e IA para identificar obstáculos como calçadas quebradas, ausência de rampas e bloqueios no caminho.
 
---
 
## 🛠️ Tech Stack
 
- **Node.js** + **NestJS**: framework modular e escalável para APIs REST
- **TypeORM** + **PostgreSQL**: persistência de dados com entidades tipadas
- **Google Maps Directions API**: cálculo de rotas e etapas de transporte
- **Google Street View API**: imagens reais dos trechos a pé da rota
- **Gemini 2.5 Flash (Google AI)**: análise de acessibilidade via visão computacional
- **OpenRouteService (ORS)**: roteamento especializado para cadeirantes
- **Nominatim (OpenStreetMap)**: geocodificação de endereços
 
---
 
## 📁 Estrutura do Projeto
 
```
src/
├── users/
│   ├── users.controller.ts
│   ├── users.controller.spec.ts
│   ├── users.service.ts
│   ├── users.service.spec.ts
│   ├── users.entity.ts
│   └── users.module.ts
├── places/
│   ├── places.controller.ts
│   ├── places.controller.spec.ts
│   ├── places.service.ts
│   ├── places.service.spec.ts
│   ├── places.entity.ts
│   └── places.module.ts
├── routes/
│   ├── routes.controller.ts
│   ├── routes.controller.spec.ts
│   ├── routes.service.ts
│   ├── routes.service.spec.ts
│   ├── routes.entity.ts
│   ├── routes.module.ts
│   ├── google-routes.service.ts
│   ├── streetview.service.ts
│   ├── gemini.service.ts
│   ├── ors.service.ts
│   └── nominatim.service.ts
├── reviews/
│   ├── reviews.controller.ts
│   ├── reviews.controller.spec.ts
│   ├── reviews.service.ts
│   ├── reviews.service.spec.ts
│   ├── reviews.entity.ts
│   └── reviews.module.ts
├── app.controller.ts
├── app.controller.spec.ts
├── app.service.ts
├── app.module.ts
└── main.ts
test/
├── app.e2e-spec.ts
└── jest-e2e.json
.env
.env.example
.eslintrc.js
.prettierrc
nest-cli.json
package.json
tsconfig.json
tsconfig.build.json
```
 
---
 
## ⚙️ Pré-requisitos
 
- Node.js 18+
- PostgreSQL rodando localmente ou via Docker
 
---
 
## 🚀 Instalação e uso
 
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/mobility.git
cd mobility
 
# Instale as dependências
npm install
 
# Configure as variáveis de ambiente
cp .env.example .env
 
# Rode em desenvolvimento
npm run start:dev
```
 
A API estará disponível em `http://localhost:3000`.
 
---
 
## 🔑 Variáveis de Ambiente
 
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
 
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=sua_senha
DATABASE_NAME=Mobility
 
GOOGLE_API_KEY=sua_chave_google
GEMINI_API_KEY=sua_chave_gemini
ORS_API_KEY=sua_chave_ors
```
 
> ⚠️ Nunca suba o arquivo `.env` com chaves reais para o repositório. Certifique-se que ele está no `.gitignore`.
 
---
 
## 📡 Endpoints
 
### Users `/users`
 
| Método | Rota         | Descrição                    |
|--------|--------------|------------------------------|
| POST   | `/users`     | Cadastra um novo usuário     |
| GET    | `/users/:id` | Busca um usuário pelo ID     |
 
**Body — POST `/users`**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "disability_type": "cadeirante"
}
```
 
---
 
### Places `/places`
 
| Método | Rota           | Descrição                     |
|--------|----------------|-------------------------------|
| GET    | `/places`      | Lista todos os locais         |
| GET    | `/places/:id`  | Busca um local pelo ID        |
| POST   | `/places`      | Cadastra um novo local        |
| PUT    | `/places/:id`  | Atualiza os dados de um local |
 
**Body — POST/PUT `/places`**
```json
{
  "name": "Terminal Rodoviário Central",
  "type": "transporte",
  "city": "Brasília",
  "address": "Setor de Autobuses, s/n",
  "accessible": true,
  "disability_type": "cadeirante",
  "observation": "Rampa disponível na entrada lateral"
}
```
 
---
 
### Routes `/routes`
 
| Método | Rota                        | Descrição                           |
|--------|-----------------------------|-------------------------------------|
| POST   | `/routes/check`             | Verifica e analisa rotas acessíveis |
| GET    | `/routes/:id`               | Busca uma rota pelo ID              |
| GET    | `/routes/history/:user_id`  | Histórico de rotas do usuário       |
 
**Body — POST `/routes/check`**
```json
{
  "user_id": 1,
  "origin": "Av. Paulista, 1000, São Paulo",
  "destination": "Estação da Sé, São Paulo",
  "transport_type": "transit"
}
```
 
**Como funciona a análise de rota:**
1. A Google Directions API calcula as opções de trajeto
2. Para cada trecho a pé, o Street View captura imagens em 3 pontos (início, meio e fim)
3. O Gemini 2.5 Flash analisa cada imagem e identifica obstáculos de acessibilidade
4. As rotas são ordenadas priorizando as mais acessíveis
5. O resultado retorna até 3 opções com alertas por trecho
 
---
 
### Reviews `/reviews`
 
| Método | Rota            | Descrição                       |
|--------|-----------------|---------------------------------|
| POST   | `/reviews`      | Cadastra uma avaliação de local |
| GET    | `/reviews/:id`  | Busca uma avaliação pelo ID     |
 
**Body — POST `/reviews`**
```json
{
  "user_id": 1,
  "place_id": 3,
  "accessible": true,
  "comment": "Rampa em bom estado, fácil acesso"
}
```
 
---
 
## 🗺️ Roadmap
 
- [x] CRUD de usuários com perfil de deficiência
- [x] CRUD de locais com dados de acessibilidade
- [x] Sistema de avaliações colaborativas
- [x] Verificação de rotas com Google Directions API
- [x] Análise de acessibilidade via Street View + Gemini AI
- [x] Roteamento para cadeirantes via OpenRouteService
- [ ] Autenticação JWT
- [ ] Filtro de rotas por tipo de deficiência
- [ ] Frontend em React
 
---
 
## 📄 Licença
 
MIT
 
