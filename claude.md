# CLAUDE.md — Café System

> Sistema de pedidos e gerenciamento de caixa para cafés da manhã (SaaS multi-tenant).

---

## Visão geral do projeto

App completo para operação de café da manhã: fazer pedidos (mesa + delivery), gerenciar caixa, imprimir comandas na cozinha, e vender como SaaS para outros estabelecimentos. Cada café é um tenant isolado.

---

## Stack definida

| Camada            | Tecnologia                                      |
| ----------------- | ------------------------------------------------ |
| **Backend**       | Fastify + TypeScript                             |
| **Auth**          | Better Auth (plugin organization p/ multi-tenant)|
| **Frontend**      | Next.js 14+ (App Router) + Tailwind + shadcn/ui |
| **Banco**         | PostgreSQL + Prisma ORM                          |
| **Tempo real**    | @fastify/websocket                               |
| **Impressão**     | node-thermal-printer (print-agent local)         |
| **Validação**     | Zod (schemas compartilhados front/back)          |
| **Monorepo**      | Turborepo                                        |
| **Infra**         | Docker Compose + Nginx + Let's Encrypt (VPS)     |
| **Upload**        | Cloudinary                                       |
| **Lint/Format**   | Biome                                            |
| **Testes**        | Vitest + Supertest + Playwright                  |

---

## Estrutura do monorepo

```
cafe-system/
├── apps/
│   ├── api/                    ← Fastify backend
│   │   └── src/
│   │       ├── plugins/        ← auth, prisma, websocket, cors, etc
│   │       ├── modules/
│   │       │   ├── tenants/    ← routes.ts, handlers.ts, schemas.ts
│   │       │   ├── products/
│   │       │   ├── categories/
│   │       │   ├── orders/
│   │       │   ├── tables/
│   │       │   ├── customers/
│   │       │   ├── payments/
│   │       │   ├── cash-register/
│   │       │   ├── reports/
│   │       │   └── printing/
│   │       ├── hooks/          ← onRequest, preHandler (tenant guard, role guard)
│   │       ├── lib/            ← better-auth config, prisma client, websocket emitter
│   │       └── server.ts
│   ├── web/                    ← Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         ← login, registro, esqueci senha
│   │   │   └── (dashboard)/
│   │   │       ├── pedidos/
│   │   │       ├── mesas/
│   │   │       ├── cardapio/
│   │   │       ├── caixa/
│   │   │       ├── cozinha/
│   │   │       ├── delivery/
│   │   │       ├── configuracoes/
│   │   │       └── relatorios/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/                ← api client, better-auth client, websocket client
│   │   └── stores/             ← zustand stores (cart, orders, ui)
│   └── print-agent/            ← micro serviço local de impressão
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── shared/                 ← types, enums, Zod schemas, constantes
│   │   ├── src/
│   │   │   ├── enums.ts
│   │   │   ├── schemas/        ← order.schema.ts, product.schema.ts, etc
│   │   │   └── types/
│   │   └── package.json
│   └── db/                     ← schema.prisma, migrations, seed
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── package.json
├── docker-compose.yml
├── turbo.json
├── biome.json
├── package.json
└── CLAUDE.md                   ← este arquivo
```

---

## Modelagem do banco (resumo)

### Tabelas principais

| Tabela              | Descrição                                      |
| ------------------- | ---------------------------------------------- |
| `tenants`           | Cada café (name, slug, logo, delivery_enabled, delivery_schedule jsonb) |
| `users`             | Usuários do sistema (via Better Auth + campos custom) |
| `categories`        | Categorias do cardápio (pães, sucos, cafés...)  |
| `products`          | Produtos com preço, foto, disponibilidade       |
| `product_addons`    | Adicionais por produto (+queijo, +presunto)     |
| `tables`            | Mesas do estabelecimento (número, capacidade, status) |
| `customers`         | Clientes delivery (nome, telefone, endereço)    |
| `orders`            | Pedidos (type: dine_in/delivery, status, mesa ou cliente) |
| `order_items`       | Itens do pedido (produto, qtd, preço unitário)  |
| `order_item_addons` | Adicionais escolhidos por item                  |
| `payments`          | Pagamentos (method: cash/credit/debit/pix, valor, troco) |
| `cash_registers`    | Abertura/fechamento de caixa                    |
| `cash_movements`    | Sangria e suprimento                            |
| `print_jobs`        | Fila de impressão (status, tentativas)          |

### Enums

```
OrderType:     dine_in | delivery
OrderStatus:   pending | preparing | ready | delivered | finished | cancelled
PaymentMethod: cash | credit_card | debit_card | pix
TableStatus:   free | occupied | awaiting_payment
UserRole:      owner | manager | attendant | kitchen
CashMovement:  withdrawal | deposit
PrintJobType:  kitchen_ticket | payment_receipt
PrintJobStatus: queued | sent | printed | failed
```

### Regras importantes

- **Todas** as tabelas de domínio têm `tenant_id` (isolamento multi-tenant).
- `orders.daily_number` reseta todo dia (sequencial por tenant por dia).
- `payments` aceita múltiplos registros por pedido (pagamento misto).
- `delivery_schedule` é JSONB: `{"mon": {"open":"06:00","close":"11:00"}, "wed": null}`.
- Preços em `order_items` são travados no momento da venda (não apontam para o preço atual do produto).

---

## Convenções de código

### Geral

- TypeScript strict mode em todo o projeto.
- Zod schemas definidos em `packages/shared` e reutilizados no front e back.
- Nomes de variáveis e funções em inglês. Comentários podem ser em português.
- Cada módulo do backend segue a estrutura: `routes.ts`, `handlers.ts`, `schemas.ts`.
- Um plugin Fastify por módulo, registrado com prefixo: `/api/v1/orders`, `/api/v1/products`, etc.

### Backend (Fastify)

- Plugins Fastify para cross-cutting: auth, prisma, websocket, error-handler.
- Hooks `onRequest` para injetar `tenantId` em toda request autenticada.
- Hook `preHandler` para checagem de role por rota.
- Respostas sempre no formato: `{ data: T }` ou `{ error: { code: string, message: string } }`.
- HTTP status codes corretos: 200, 201, 400, 401, 403, 404, 409, 422, 500.

### Frontend (Next.js)

- App Router com route groups: `(auth)` e `(dashboard)`.
- Layout do dashboard com sidebar fixa + área de conteúdo.
- Zustand para estado global (carrinho, pedido em construção, UI state).
- React Query (TanStack Query) para cache de dados do servidor.
- Componentes em `components/` organizados por feature quando complexos.
- Toda tela otimizada para tablet (breakpoint principal: 768px-1024px).

### Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Branch principal: `main`. Feature branches: `feat/nome-da-feature`.
- PR obrigatório para main (mesmo solo — cria o hábito).

---

## Desenvolvimento passo a passo

> **IMPORTANTE**: Seguir esta ordem. Cada fase depende da anterior.
> Não pule fases. Complete e teste cada uma antes de avançar.

---

### FASE 1 — Fundação (monorepo + banco + auth)

**Objetivo**: Ter o monorepo rodando, banco criado, e auth funcionando (login/registro/sessão).

```
Passo 1.1 — Inicializar monorepo com Turborepo
  - npm create turbo@latest
  - Configurar workspaces: apps/api, apps/web, packages/shared, packages/db
  - Configurar Biome (lint + format)
  - Configurar tsconfig base compartilhado
  - docker-compose.yml com PostgreSQL + Redis
  - Testar: `turbo dev` sobe tudo

Passo 1.2 — Configurar Prisma e criar schema do banco
  - Instalar Prisma em packages/db
  - Escrever schema.prisma completo (todas as tabelas acima)
  - Criar migration inicial
  - Criar seed com dados de exemplo (1 tenant, 1 user owner, categorias, produtos)
  - Testar: `npx prisma studio` mostra as tabelas

Passo 1.3 — Configurar Fastify base
  - Criar server.ts com plugins essenciais: cors, helmet
  - Plugin prisma (decorar fastify com prisma client)
  - Plugin error-handler (formato padrão de erro)
  - Health check route: GET /api/health
  - Testar: curl localhost:3333/api/health retorna { status: "ok" }

Passo 1.4 — Integrar Better Auth
  - Configurar Better Auth com adapter Prisma
  - Plugin organization habilitado (tenant = organization)
  - Roles: owner, manager, attendant, kitchen
  - Montar plugin Fastify que registra as rotas do Better Auth
  - Hook onRequest que injeta session + tenantId nas requests autenticadas
  - Hook preHandler para role guard (decorator ou schema-based)
  - Testar: registro → login → sessão → logout via API

Passo 1.5 — Configurar Next.js base
  - Criar app com App Router
  - Instalar Tailwind + shadcn/ui
  - Better Auth client SDK configurado
  - Telas de auth: login e registro (funcionais, conectadas ao backend)
  - Layout do dashboard com sidebar placeholder
  - Middleware de auth protegendo rotas do dashboard
  - Testar: registrar → logar → ver dashboard vazio → logout
```

**Checkpoint da Fase 1**: Usuário consegue se registrar, criar uma organization (café), logar, ver o dashboard vazio, e deslogar. Banco com todas as tabelas criadas.

---

### FASE 2 — Cardápio (CRUD de categorias e produtos)

**Objetivo**: Dono/gerente consegue montar o cardápio completo do café.

```
Passo 2.1 — API de categorias
  - CRUD: POST, GET (lista), PUT, DELETE (soft delete via active=false)
  - Reordenação via PUT /categories/reorder (array de IDs)
  - Filtro por tenant_id automático via hook
  - Validação com Zod schemas (em packages/shared)
  - Testar: criar 5 categorias, reordenar, desativar uma

Passo 2.2 — API de produtos
  - CRUD completo com upload de imagem (Cloudinary)
  - Filtro por categoria, por disponibilidade
  - Toggle de disponível/esgotado: PATCH /products/:id/availability
  - Testar: criar produtos com imagem, marcar esgotado

Passo 2.3 — API de adicionais (product_addons)
  - CRUD vinculado ao produto
  - Testar: criar adicionais para um produto

Passo 2.4 — Tela de cardápio (frontend)
  - Lista de categorias com drag-and-drop para reordenar
  - Lista de produtos por categoria com card visual (foto, nome, preço)
  - Modal/drawer de criar/editar produto com upload de imagem
  - Toggle de disponibilidade direto no card
  - Seção de adicionais dentro do form do produto
  - Responsivo: funcionar bem em tablet
  - Testar: montar um cardápio completo pelo frontend
```

**Checkpoint da Fase 2**: Cardápio completo cadastrado com categorias, produtos com foto, e adicionais. Tudo via interface.

---

### FASE 3 — Mesas e pedidos presenciais

**Objetivo**: Atendente abre pedido para uma mesa, adiciona itens, e o pedido aparece no sistema.

```
Passo 3.1 — API de mesas
  - CRUD de mesas (número, capacidade)
  - Status automático baseado em pedidos ativos
  - GET /tables retorna mapa visual com status
  - Testar: criar 10 mesas, verificar status

Passo 3.2 — API de pedidos (core)
  - POST /orders — criar pedido (type: dine_in, table_id)
  - POST /orders/:id/items — adicionar item com adicionais e observações
  - PATCH /orders/:id/status — mudar status (com validação de transição)
  - GET /orders — lista com filtros (status, type, data)
  - GET /orders/:id — detalhe completo com items e addons
  - daily_number: sequencial por tenant por dia (max do dia + 1)
  - Cálculo automático de subtotal e total
  - Testar: criar pedido, adicionar itens, avançar status

Passo 3.3 — Tela de mesas (frontend)
  - Grid visual de mesas com cores por status (verde=livre, vermelho=ocupada, amarelo=aguardando)
  - Clicar numa mesa livre → abre tela de novo pedido
  - Clicar numa mesa ocupada → abre o pedido ativo dela
  - Testar: fluxo completo mesa livre → pedido → mesa ocupada

Passo 3.4 — Tela de novo pedido (frontend)
  - Cardápio visual com categorias em tabs/pills
  - Clicar produto → adiciona ao carrinho (sidebar ou bottom sheet)
  - Seleção de adicionais e campo de observação por item
  - Quantidade ajustável (+/-)
  - Resumo com subtotal em tempo real
  - Botão "Confirmar pedido" → POST na API
  - Testar: montar pedido completo com 5+ itens e adicionais

Passo 3.5 — Tela de pedidos ativos (frontend)
  - Lista/kanban de pedidos por status (pendente → preparando → pronto)
  - Card de pedido com: nº, mesa, horário, itens resumidos
  - Botão de avançar status em cada card
  - Auto-refresh ou WebSocket (implementar WS na próxima fase)
  - Testar: 3 pedidos simultâneos em diferentes status
```

**Checkpoint da Fase 3**: Fluxo completo de mesa → pedido → acompanhamento de status. Atendente consegue operar.

---

### FASE 4 — Caixa e pagamentos

**Objetivo**: Registrar pagamentos, abrir/fechar caixa, sangria e suprimento.

```
Passo 4.1 — API de caixa
  - POST /cash-register/open — abrir caixa (valor inicial)
  - POST /cash-register/close — fechar caixa (calcula resumo)
  - GET /cash-register/current — caixa aberto atual
  - POST /cash-register/movements — sangria ou suprimento
  - Validação: só 1 caixa aberto por vez por tenant
  - Resumo de fechamento: total por forma de pagamento, vendas, cancelamentos
  - Testar: abrir → registrar movimentos → fechar → verificar resumo

Passo 4.2 — API de pagamentos
  - POST /orders/:id/payments — registrar pagamento
  - Suporte a pagamento parcial e misto
  - Cálculo de troco automático (dinheiro)
  - Ao pagar total → pedido muda para "finished", mesa para "free"
  - Testar: pagar pedido com Pix + dinheiro, verificar troco

Passo 4.3 — Tela de caixa (frontend)
  - Abertura de caixa com valor inicial
  - Painel mostrando: total vendido, por forma de pagamento, sangrias
  - Botão de sangria/suprimento com modal de motivo e valor
  - Tela de fechamento com resumo detalhado e confirmação
  - Testar: fluxo completo de um dia: abrir → vender → sangria → fechar

Passo 4.4 — Tela de pagamento (frontend)
  - Acessada ao finalizar pedido ou via mesa "aguardando pagamento"
  - Mostra total do pedido e itens
  - Seleção de forma de pagamento (botões grandes)
  - Para dinheiro: campo "valor recebido" com cálculo de troco
  - Suporte a dividir: adicionar múltiplas formas até cobrir o total
  - Botão "Confirmar pagamento"
  - Testar: pagar com cada forma de pagamento e pagamento misto
```

**Checkpoint da Fase 4**: Fluxo financeiro completo. Abrir caixa, vender, receber pagamento, sangria, fechar caixa com resumo.

---

### FASE 5 — Delivery

**Objetivo**: Receber e gerenciar pedidos delivery com cliente, endereço e taxa.

```
Passo 5.1 — API de clientes
  - CRUD de clientes (nome, telefone, endereço, bairro, referência)
  - Busca por telefone (autocomplete para clientes recorrentes)
  - Testar: cadastrar clientes, buscar por telefone

Passo 5.2 — API de delivery
  - Criar pedido com type: delivery + customer_id
  - Cálculo de taxa de entrega (por bairro ou valor fixo configurável)
  - Status adicional: "out_for_delivery"
  - Verificação de delivery_enabled e delivery_schedule antes de criar
  - Testar: criar pedido delivery, verificar bloqueio fora do horário

Passo 5.3 — Configurações de delivery (frontend)
  - Toggle delivery ligado/desligado
  - Configuração de horários por dia da semana
  - Tabela de taxas por bairro
  - Testar: configurar schedule, desligar delivery, tentar criar pedido

Passo 5.4 — Tela de delivery (frontend)
  - Formulário de novo pedido delivery (busca cliente por telefone)
  - Mesmo seletor de cardápio da Fase 3
  - Mostra taxa de entrega e total
  - Lista de pedidos delivery com status
  - Testar: pedido delivery completo de ponta a ponta
```

**Checkpoint da Fase 5**: Delivery funcionando com cliente, taxa, horário configurável, e toggle manual.

---

### FASE 6 — Tempo real (WebSocket)

**Objetivo**: Cozinha e atendentes recebem atualizações em tempo real.

```
Passo 6.1 — WebSocket no backend
  - Configurar @fastify/websocket
  - Channels por tenant: tenant:{id}:orders, tenant:{id}:kitchen
  - Eventos: order_created, order_status_changed, order_cancelled
  - Autenticação do WS via token na conexão
  - Testar: conectar 2 clients, criar pedido, ambos recebem

Passo 6.2 — Tela da cozinha (frontend)
  - Tela fullscreen otimizada para monitor/tablet na cozinha
  - Cards de pedidos pendentes e em preparo (layout grande, legível)
  - Botão "Iniciar preparo" e "Pronto" em cada card
  - Som/notificação ao chegar novo pedido
  - Sem sidebar, sem menu — só os pedidos
  - Auto-update via WebSocket (sem refresh)
  - Testar: fazer pedido no tablet do atendente, aparecer na cozinha

Passo 6.3 — Atualizar telas existentes com WS
  - Tela de mesas: status atualiza em tempo real
  - Tela de pedidos: novos pedidos aparecem sem refresh
  - Tela de caixa: total atualiza ao registrar pagamento
  - Testar: 2 abas abertas, ações em uma refletem na outra
```

**Checkpoint da Fase 6**: Sistema reativo. Pedido feito pelo atendente aparece na cozinha instantaneamente. Status sincronizado em todas as telas.

---

### FASE 7 — Impressão térmica

**Objetivo**: Comandas saem automaticamente na impressora ao confirmar pedido.

```
Passo 7.1 — Print agent (micro serviço local)
  - App Node.js standalone com node-thermal-printer
  - Conecta via WebSocket ao backend (canal de impressão do tenant)
  - Recebe job → formata ESC/POS → envia para impressora USB/rede
  - Retry automático (3 tentativas)
  - Config via .env: printer type, interface, tenant token
  - Testar: enviar job mock, imprimir na impressora

Passo 7.2 — Templates de impressão
  - Template comanda cozinha: nº pedido, MESA X ou DELIVERY, itens com qtd e obs, horário
  - Template cupom pagamento: dados do café, itens, total, forma de pagamento, data/hora
  - Formatação 58mm e 80mm
  - Testar: imprimir ambos os templates

Passo 7.3 — Integração backend
  - Ao confirmar pedido → cria print_job → emite via WS para print-agent
  - Ao registrar pagamento → cria print_job do cupom
  - Status do job: queued → sent → printed / failed
  - Botão "reimprimir" no frontend
  - Testar: fluxo completo pedido → impressão automática
```

**Checkpoint da Fase 7**: Comanda sai automaticamente na impressora da cozinha. Cupom impresso ao pagar.

---

### FASE 8 — Relatórios

**Objetivo**: Dono vê métricas de vendas e performance.

```
Passo 8.1 — API de relatórios
  - GET /reports/sales?period=day|week|month — vendas por período
  - GET /reports/products — ranking de mais vendidos
  - GET /reports/payments — faturamento por forma de pagamento
  - GET /reports/summary — ticket médio, total pedidos, cancelamentos
  - Filtros por data (de/até)
  - Testar: gerar relatórios com dados de seed

Passo 8.2 — Tela de relatórios (frontend)
  - Dashboard com cards de métricas (faturamento, ticket médio, nº pedidos)
  - Gráfico de vendas por dia (recharts ou chart.js)
  - Ranking de produtos mais vendidos
  - Filtro de período
  - Testar: visualizar relatórios com dados reais
```

**Checkpoint da Fase 8**: Dono acompanha vendas, produtos top, e faturamento por forma de pagamento.

---

### FASE 9 — Multi-tenant SaaS

**Objetivo**: Outros cafés conseguem se cadastrar e usar o sistema.

```
Passo 9.1 — Onboarding
  - Fluxo de registro: criar conta → criar organization (café) → configurar dados
  - Tela de setup inicial: nome do café, logo, endereço, mesas
  - Slug único para cada café
  - Testar: novo usuário se registra e configura o café do zero

Passo 9.2 — Planos e limites
  - Plano Free: até 50 pedidos/dia, 1 usuário, sem relatórios avançados
  - Plano Pro: ilimitado, múltiplos usuários, relatórios completos
  - Middleware que checa limites antes de criar pedido
  - Tela de upgrade com comparação de planos
  - Testar: atingir limite do free, ver bloqueio e tela de upgrade

Passo 9.3 — Painel admin (seu, como dono do SaaS)
  - Dashboard com total de tenants, pedidos globais, MRR
  - Lista de tenants com status, plano, uso
  - Ações: ativar/desativar tenant, mudar plano
  - Rota protegida: só seu usuário super-admin acessa
  - Testar: visualizar e gerenciar tenants
```

**Checkpoint da Fase 9**: Qualquer pessoa pode se cadastrar, criar seu café, e usar o sistema. Você gerencia tudo pelo painel admin.

---

### FASE 10 — Deploy e produção

**Objetivo**: Sistema rodando em produção, acessível pela internet.

```
Passo 10.1 — Dockerizar
  - Dockerfile para api (multi-stage build)
  - Dockerfile para web (Next.js standalone)
  - docker-compose.prod.yml com: api, web, postgres, redis, nginx
  - Nginx config com SSL (certbot/let's encrypt)
  - Testar: docker compose up -d roda tudo localmente

Passo 10.2 — Deploy na VPS
  - Provisionar VPS (Hetzner CX22)
  - Configurar domínio + DNS
  - Deploy via SSH + docker compose
  - Backup automático do PostgreSQL (cron + pg_dump → storage)
  - Monitoramento básico (uptime, logs)
  - Testar: acessar app pelo domínio, HTTPS funcionando

Passo 10.3 — PWA
  - Configurar next-pwa (manifest, service worker)
  - Cache de assets e telas críticas para modo offline
  - Sync de pedidos offline quando reconectar
  - Testar: desligar internet, fazer pedido, religar, verificar sync
```

**Checkpoint da Fase 10**: Sistema em produção, acessível pelo domínio, com HTTPS, backup, e PWA.

---

## Regras para o Claude seguir durante o desenvolvimento

1. **Sempre passo a passo**: nunca implementar mais de um passo por vez. Completar, testar, e confirmar antes de avançar.
2. **Sempre perguntar** antes de prosseguir para o próximo passo.
3. **Código completo**: não usar placeholder ou `// TODO`. Cada passo entrega código funcional.
4. **Testes junto**: cada passo inclui como testar o que foi feito (curl, browser, etc).
5. **Sem over-engineering**: implementar o mínimo que funciona, refatorar depois se necessário.
6. **Schemas compartilhados**: qualquer tipo ou validação que front e back usam vai em `packages/shared`.
7. **Mensagens de commit**: sugerir a mensagem de commit ao final de cada passo.
8. **Erros e edge cases**: tratar desde o início (ex: "e se o delivery estiver desligado?", "e se o caixa não estiver aberto?").