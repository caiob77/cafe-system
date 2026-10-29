# ☕ Cafe System

**O sistema de pedidos feito para cafés da manhã.**
Mesa, balcão e delivery no mesmo lugar, do pedido do cliente até o fechamento do caixa.

---

## O problema

Café da manhã é rápido: pico de 2 a 3 horas, muitos pedidos pequenos, cliente com
pressa e cozinha apertada. Pedido anotado em papel se perde, delivery chega pelo
WhatsApp sem padrão, e no fim do dia ninguém sabe ao certo quanto entrou no caixa.

## A solução

O Cafe System centraliza a operação inteira em uma tela, no computador ou no
celular:

- O cliente pede pelo **link da loja**, sem baixar app e sem criar conta.
- O pedido cai **na hora** na tela de pedidos e sai impresso na cozinha.
- O caixa fecha com **o valor exato** por forma de pagamento.
- O dono acompanha **o que vende, quando e quanto** pelos relatórios.

## Funcionalidades

### 🛵 Loja pública de delivery

Cada estabelecimento ganha um link próprio (`seu-dominio.com/loja/seu-cafe`) para
mandar no WhatsApp, Instagram ou Google.

- Cardápio com fotos, descrições e adicionais.
- Carrinho e endereço pensados para celular.
- Taxa de entrega por bairro e horário de funcionamento: fora do horário, ou em
  bairro não atendido, o pedido é bloqueado com uma mensagem clara.
- Logo e cor da marca do próprio café.

### 🧾 Pedidos de mesa, balcão e delivery

- Um único fluxo para todos os tipos de pedido.
- Mapa de mesas (livre, ocupada, aguardando pagamento) com atualização automática.
- Observações por item ("sem cebola", "pão bem passado") e adicionais.

### 👩‍🍳 Cozinha

- Fila de pedidos por status: pendente, em preparo, pronto, saiu para entrega,
  entregue.
- Impressão automática do ticket na impressora térmica da cozinha.

### 💰 Caixa

- Abertura e fechamento de caixa, com registro de quem abriu.
- Pagamentos em dinheiro, Pix, crédito e débito.
- Sangria e suprimento registrados no caixa.

### 📊 Relatórios

- Vendas por período, produtos mais vendidos, formas de pagamento e resumo do dia.

### ⚙️ Gestão do estabelecimento

- Cardápio com categorias, produtos, preços e adicionais.
- Equipe com perfis de acesso: dono, gerente, atendente e cozinha.
- Configuração de delivery, bairros, taxas e horários.

## Para quem é

- Cafeterias e padarias com movimento forte pela manhã.
- Casas de café da manhã regional.
- Quem vende delivery pelo WhatsApp e quer parar de anotar pedido à mão.

## Planos

O Cafe System é um SaaS: cada estabelecimento tem sua conta, seus dados e seu
cardápio, isolados dos demais.

| Plano | Limites |
| --- | --- |
| **Free** | Até 50 pedidos por dia, 2 pessoas na equipe, relatórios básicos |
| **Pro** | Pedidos e equipe ilimitados, relatórios avançados |

O cadastro de um novo estabelecimento é feito pelo próprio sistema, com um
assistente de configuração inicial com os dados e a identidade do estabelecimento.

## Segurança e confiabilidade

- **Dados isolados por estabelecimento** em duas camadas: na aplicação e no
  próprio banco de dados (Row-Level Security no PostgreSQL).
- **HTTPS obrigatório** em produção, com certificado renovado automaticamente.
- **Impressoras com token próprio**, que pode ser revogado a qualquer momento sem
  afetar os usuários.
- **Pedido sem duplicidade**: se a internet do cliente oscilar e ele tocar duas
  vezes em "Enviar", só um pedido é criado.

## Tecnologia

Next.js, React, Fastify, PostgreSQL, Prisma e Redis, empacotados em Docker com
nginx e Let's Encrypt. Monorepo com pnpm e Turborepo.

---

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Guia de desenvolvimento](./docs/desenvolvimento.md) | Setup local, comandos, API, impressão e arquitetura |
| [Colocar em produção](./docs/producao.md) | Checklist de pendências e passo a passo de deploy |
| [Isolamento multi-tenant (RLS)](./docs/rls.md) | Como ligar e testar o Row-Level Security |

### Início rápido (desenvolvimento)

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm -F @cafe/db db:migrate
pnpm dev:api   # http://localhost:3333
pnpm dev:web   # http://localhost:3000
```

Detalhes de seed, roles do banco e print-agent no
[guia de desenvolvimento](./docs/desenvolvimento.md).
