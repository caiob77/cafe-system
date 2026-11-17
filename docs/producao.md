# Colocar em produção

Duas partes:

1. [Checklist antes de produção](#1-checklist-antes-de-produção): o que precisa

   estar resolvido antes de abrir para clientes.
2. [Passo a passo do deploy](#2-passo-a-passo-do-deploy): comandos na ordem certa,

   do servidor vazio até o primeiro pedido.

---

## 1. Checklist antes de produção

Legenda: 🔴 bloqueia o lançamento · 🟡 importante, pode entrar logo depois · 🟢 recomendado · ⏸️ adiado

### Conteúdo e fotos

- [x] 🔴 **Enviar as fotos dos produtos.** O catálogo inicial do seed tem 72
  ```
  produtos e **nenhum tem foto**. Sem foto, a loja mostra só nome e preço.
  ```
  - Formato sugerido: JPG ou WebP, quadrada (1:1), 800×800 px, até 300 KB.
  - Nome do arquivo igual ao nome do produto (ex.: `pao-na-chapa.jpg`), para
  facilitar o cadastro.
  - Lista de produtos: categorias e itens definidos em `packages/db/prisma/seed.ts`.
- [x] 🔴 **Enviar a logo do café** (PNG com fundo transparente ou quadrada, mínimo
  ```
  256×256 px).
  ```
- [x] 🔴 **Criar o campo para essas fotos na página de delivery público.**
  ```
  Resolvido com Cloudinary:
  ```
  - upload de arquivo em Cardápio → produto → "Foto", Configurações → Café →
  "Logo" e "Banner da loja", e no assistente de configuração inicial;
  - a API (`POST /api/v1/uploads/signature`, owner/manager) só assina o upload; o
  navegador envia direto ao Cloudinary, na pasta `cafe/<slug>/<tipo>`
  (`asset_folder` + `public_id_prefix` — contas novas usam dynamic folders);
  - o Cloudinary reduz a imagem ao gravar (produto 1200 px, logo 512 px, banner
  1920 px) e a loja pede miniaturas em WebP/AVIF (`f_auto,q_auto`);
  - novo campo `bannerUrl` (migration `20261029160000_add_banner_url`).
- [x] 🔴 **Criar a conta no Cloudinary** e preencher `CLOUDINARY_CLOUD_NAME`,
  ```
  `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` no `.env.production`. Sem
  elas o botão de upload responde "Upload de imagens não configurado" (colar
  URL continua funcionando).
  ```
- [x] 🟡 Revisar preços, descrições e disponibilidade de todos os produtos.
- [x] 🟡 Definir a cor da marca (Configurações → Café).
- [x] 🟡 Cadastrar bairros atendidos, taxas de entrega e horário de funcionamento.

### Bloqueios técnicos encontrados no código

- [x] 🔴 **WebSocket do print-agent não passa pelo nginx.** Resolvido:
  ```
  `nginx/conf.d/default.conf.template` tem um `location /api/v1/realtime`
  com `Upgrade`/`Connection` e `proxy_read_timeout 24h`.
  ```
- [ ] ⏸️ **Impressão física.** Adiada: o lançamento sai sem impressora, com a
  ```
  cozinha acompanhando pela tela de pedidos. Ver
  [Pendências depois do lançamento](#pendências-depois-do-lançamento).
  ```
- [ ] 🔴 **Ligar o RLS em produção** (passo 11). Sem isso, o isolamento entre
  ```
  estabelecimentos depende só da aplicação.
  ```
- [x] 🟡 **Seed em produção não recebe as variáveis** `SEED_`***.** Resolvido no
  ```
  passo 10: as variáveis entram no container com `dc exec -e`.
  ```
- [x] 🟡 **Backup automático do Postgres.** Resolvido: `scripts/backup-db.sh`
  ```
  (passo 14).
  ```
- [x] 🟢 `docs/` **está no** `.gitignore`**.** Resolvido: o `.gitignore` tem exceções
  ```
  para `producao.md`, `desenvolvimento.md` e `rls.md`.
  ```

### Infraestrutura e contas

- [ ] 🔴 VPS com Docker e Docker Compose, mínimo sugerido de 2 GB de RAM (o build
  ```
  do Next.js consome memória).
  ```
- [ ] 🔴 Domínio registrado com um registro DNS `A` apontando para o IP da VPS.
- [ ] 🔴 Portas 80 e 443 abertas no firewall da VPS.
- [ ] 🔴 E-mail para o Let's Encrypt (avisos de expiração do certificado).
- [ ] 🟡 Computador fixo no café para rodar o print-agent, ligado à impressora.

### Segurança

- [x] 🔴 Todas as senhas e segredos gerados com valores fortes e únicos (passo 4).
  As chaves do Cloudinary do `.env` local foram copiadas para o
  `.env.production`.
- [x] 🔴 `.env.production` **fora do git** (já está no `.gitignore` e o git não
  rastreia o arquivo). Copie o arquivo para um gerenciador de senhas antes do
  deploy: ele não está em nenhum backup do repositório.
- [x] 🔴 `SUPER_ADMIN_EMAILS` preenchido só com o seu e-mail.
- [ ] 🔴 `SEED_CONFIRM_RESET` removido ou `false` depois do primeiro seed (o seed
  ```
  **apaga todos os dados**).
  ```

### Validação final

- [ ] 🔴 Login do dono funcionando em `https://DOMINIO/login`.
- [ ] 🔴 Pedido de teste completo pela loja: celular, fora do Wi-Fi do café.
- [ ] 🔴 Pedido aparecendo no painel e na tela da cozinha (impressora adiada).
- [ ] 🔴 Abrir caixa, registrar pagamento e fechar caixa.
- [ ] 🟡 Testar pedido fora do horário e em bairro não atendido (deve bloquear).

---

## 2. Passo a passo do deploy

Convenções usadas abaixo:

- `DOMINIO` = seu domínio, ex.: `cafe.seudominio.com.br`.
- Todos os comandos rodam **na VPS**, dentro da pasta do projeto, salvo indicação.
- Atalho para não repetir o compose:

```bash
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.production'
```

### Passo 1 — Preparar a VPS

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # sair e entrar de novo na sessão

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Passo 2 — Apontar o DNS

No painel do seu provedor de domínio, crie um registro `A`:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `cafe` (ou `@`) | IP da VPS |

Confirme antes de seguir (pode levar alguns minutos):

```bash
dig +short DOMINIO   # deve devolver o IP da VPS
```

### Passo 3 — Baixar o código

```bash
git clone <URL-DO-REPOSITORIO> cafe-system
cd cafe-system
```

### Passo 4 — Criar o `.env.production`

```bash
cp .env.production.example .env.production
```

Gere os segredos (rode uma vez para cada campo):

```bash
openssl rand -base64 48   # BETTER_AUTH_SECRET
openssl rand -hex 24      # POSTGRES_PASSWORD, RUNTIME_DB_PASSWORD, ADMIN_DB_PASSWORD
```

Preencha:

```env
DOMAIN=DOMINIO
LETSENCRYPT_EMAIL=voce@email.com

POSTGRES_USER=cafe
POSTGRES_PASSWORD=<gerado>
POSTGRES_DB=cafe                 # manter "cafe": o init-roles.sql usa esse nome fixo

RUNTIME_DB_PASSWORD=<gerado>
ADMIN_DB_PASSWORD=<gerado>
DATABASE_ADMIN_URL=postgresql://cafe_admin:<ADMIN_DB_PASSWORD>@postgres:5432/cafe?schema=public
# DATABASE_URL fica comentado até o passo 11

BETTER_AUTH_SECRET=<gerado>
BETTER_AUTH_URL=https://DOMINIO
WEB_URL=https://DOMINIO
NEXT_PUBLIC_API_URL=https://DOMINIO

SUPER_ADMIN_EMAILS=voce@email.com
PRO_PLAN_PRICE=99

# Painel do Cloudinary → Settings → API Keys
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

A senha dentro de `DATABASE_ADMIN_URL` precisa ser **igual** a `ADMIN_DB_PASSWORD`.

### Passo 5 — Build das imagens

```bash
dc build
```

### Passo 6 — Emitir o certificado SSL

Só funciona com o DNS do passo 2 já propagado.

```bash
set -a && . ./.env.production && set +a
./nginx/init-letsencrypt.sh
```

O `set -a` é obrigatório: o script chama `docker compose` sem `--env-file`, então
as variáveis precisam estar exportadas no shell (senão o compose lê o `.env` de
desenvolvimento).

O script sobe o nginx com um certificado temporário, pede o certificado real ao
Let's Encrypt e recarrega o nginx. A renovação depois é automática (container
`certbot`, a cada 12 h).

### Passo 7 — Subir a stack

```bash
dc up -d
dc ps   # todos os serviços devem estar "running" / "healthy"
```

### Passo 8 — Aplicar as migrations

```bash
dc exec api pnpm --filter @cafe/db exec prisma migrate deploy
```

### Passo 9 — Policies de RLS e roles do banco

```bash
set -a && . ./.env.production && set +a

dc exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < packages/db/prisma/sql/post-migrate.sql

dc exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v runtime_pw="$RUNTIME_DB_PASSWORD" -v admin_pw="$ADMIN_DB_PASSWORD" \
  < packages/db/prisma/sql/init-roles.sql
```

### Passo 10 — Seed do primeiro estabelecimento

⚠️ **Apaga todos os dados do banco.** Rodar só no primeiro deploy.

Adicione ao `.env.production`:

```env
SEED_CONFIRM_RESET=true
SEED_OWNER_EMAIL=voce@email.com
SEED_OWNER_PASSWORD=<senha-forte-12+>
SEED_OWNER_NAME="Seu Nome"
SEED_ORG_NAME="Café Beniel"
SEED_ORG_SLUG=cafe-beniel
SEED_ORG_PHONE="(92) 99999-9999"
SEED_ORG_ADDRESS="Rua, número - Bairro - CEP"
SEED_TABLE_COUNT=10
SEED_DELIVERY_ENABLED=true
SEED_DEFAULT_DELIVERY_FEE=0.00
SEED_DELIVERY_FEES="Centro:5.00;Cidade Nova:7.00"
SEED_LOAD_INITIAL_CATALOG=true
SEED_PRINTER_NAME="Impressora cozinha"
```

Rode passando as variáveis para dentro do container (`-e VAR` sem valor copia do
shell):

```bash
set -a && . ./.env.production && set +a

dc exec \
  -e SEED_CONFIRM_RESET -e SEED_OWNER_EMAIL -e SEED_OWNER_PASSWORD \
  -e SEED_OWNER_NAME -e SEED_ORG_NAME -e SEED_ORG_SLUG -e SEED_ORG_PHONE \
  -e SEED_ORG_ADDRESS -e SEED_TABLE_COUNT -e SEED_DELIVERY_ENABLED \
  -e SEED_DEFAULT_DELIVERY_FEE -e SEED_DELIVERY_FEES \
  -e SEED_LOAD_INITIAL_CATALOG -e SEED_PRINTER_NAME \
  api pnpm --filter @cafe/db db:seed
```

Guarde o `PRINTER_TOKEN=pd_...` exibido no final. Ele **não** pode ser recuperado
depois (o banco guarda só o hash).

Em seguida, **remova** `SEED_CONFIRM_RESET=true` e `SEED_OWNER_PASSWORD` do
`.env.production`.

> O script `db:seed` usa `dotenv -e ../../.env`, que não existe na imagem. O
> `dotenv-cli` ignora arquivo ausente e não sobrescreve variáveis já definidas,
> então os `-e` acima chegam ao seed. Se mesmo assim faltar variável, rode
> `dc exec ... api sh -c 'cd /app/packages/db && npx tsx prisma/seed.ts'` com os
> mesmos `-e`.

### Passo 11 — Ligar o RLS

```bash
set -a && . ./.env.production && set +a
dc exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER DATABASE cafe SET app.enable_rls = 'on';"
```

No `.env.production`, descomente e ajuste a senha:

```env
DATABASE_URL=postgresql://cafe_runtime:<RUNTIME_DB_PASSWORD>@postgres:5432/cafe?schema=public
```

Recrie a API para ela conectar como `cafe_runtime`:

```bash
dc up -d --force-recreate api
```

Smoke test de isolamento em [rls.md](./rls.md).

### Passo 12 — Testar

```bash
curl https://DOMINIO/api/health
# { "status": "ok", "uptime": ..., "db": "ok" }
```

No navegador:

1. `https://DOMINIO/login`: entrar com o e-mail e a senha do seed.
2. `https://DOMINIO/loja/cafe-beniel`: fazer um pedido de teste pelo celular.
3. Conferir o pedido em Pedidos/Delivery no painel.

### Passo 13 — Instalar o print-agent no café

Na máquina ligada à impressora (não na VPS):

```bash
git clone <URL-DO-REPOSITORIO> cafe-system && cd cafe-system
pnpm install
cp apps/print-agent/.env.example apps/print-agent/.env
```

`apps/print-agent/.env`:

```env
NODE_ENV=production
API_BASE_URL=https://DOMINIO
API_WS_URL=wss://DOMINIO/api/v1/realtime
PRINTER_TOKEN=pd_...   # do passo 10
```

```bash
pnpm -F @cafe/print-agent dev
# esperado: [print-agent] conectado ao WS -- sincronizando fila inicial
```

Depende da correção do nginx listada no checklist. Para o agente iniciar junto com
o computador, configure como serviço (systemd no Linux ou NSSM no Windows).

### Passo 14 — Backup diário do banco

Teste uma vez na mão:

```bash
./scripts/backup-db.sh
# [backup] ok: cafe-AAAA-MM-DD-HHMM.dump
```

Depois agende na VPS com `crontab -e` (ajuste o caminho do projeto):

```cron
0 3 * * * cd /home/USUARIO/cafe-system && ./scripts/backup-db.sh >> /var/log/cafe-backup.log 2>&1
```

O script lê `POSTGRES_USER`/`POSTGRES_DB` do `.env.production`, confere o dump
com `pg_restore --list` e mantém 14 dias (`BACKUP_RETENTION_DAYS`). O volume fica
na própria VPS: defina `BACKUP_COPY_DIR` (pasta montada de outro disco, rclone
etc.) para ter uma cópia fora da máquina.

Restaurar:

```bash
# dump dentro do volume /backups
docker exec cafe-postgres-prod pg_restore -U cafe -d cafe --clean /backups/cafe-AAAA-MM-DD-HHMM.dump
# dump copiado para o host
docker exec -i cafe-postgres-prod pg_restore -U cafe -d cafe --clean < cafe-AAAA-MM-DD-HHMM.dump
```

### Passo 15 — Finalizar o conteúdo

1. Subir as fotos e a logo (depende do campo de fotos do checklist).
2. Revisar cardápio, preços, bairros, taxas e horários pelo painel.
3. Cadastrar a equipe em Configurações.
4. Divulgar o link `https://DOMINIO/loja/cafe-beniel`.

---

## Pendências depois do lançamento

Problemas conhecidos que não bloqueiam a abertura, mas precisam ser resolvidos
com a loja rodando.

- [ ] 🟡 **Imagens antigas não são apagadas do Cloudinary.** Ao trocar ou remover
  ```
  a foto de um produto, a logo ou o banner, o arquivo anterior continua na
  conta. Para um café cabe no plano grátis; com vários cafés, ocupa espaço.
  Correção: ao salvar, a API chama o `destroy` do Cloudinary com o
  `imagePublicId` antigo (produto já guarda; logo e banner precisam de colunas
  `logoPublicId`/`bannerPublicId`). Alternativa: rotina mensal que lista a
  pasta `cafe/<slug>/` e apaga o que não está referenciado no banco.
  ```
- [ ] 🟢 **Limite de 5 MB só no navegador.** O upload vai direto do navegador ao
  ```
  Cloudinary; quem chamar a API de assinatura na mão pode enviar arquivos
  maiores, até o limite do plano do Cloudinary. Mitigação atual: só
  owner/manager assinam e o Cloudinary reduz a imagem ao gravar. Correção
  definitiva: fazer o upload passar pela API (`@fastify/multipart` com limite
  de 5 MB, checagem do tipo real do arquivo e `client_max_body_size` no nginx).
  ```
- [ ] 🟡 **Upload sem limite de quantidade.** Owner e manager podem gerar quantas
  ```
  assinaturas quiserem. Baixo risco (exige login), mas vale um rate limit por
  organização no `POST /api/v1/uploads/signature`.
  ```
- [ ] 🟡 **Impressão física.** O print-agent continua simulando no console.
  ```
  Depende do modelo e da conexão (USB/rede) da impressora.
  ```

---

## Atualizar depois do primeiro deploy

```bash
git pull
dc build api web

# Migrations rodam como owner (cafe_runtime não tem permissão de DDL)
set -a && . ./.env.production && set +a
dc exec \
  -e DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB?schema=public" \
  api pnpm --filter @cafe/db exec prisma migrate deploy

# Reaplica policies e grants (os dois scripts podem rodar de novo sem efeito colateral)
dc exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < packages/db/prisma/sql/post-migrate.sql
dc exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v runtime_pw="$RUNTIME_DB_PASSWORD" -v admin_pw="$ADMIN_DB_PASSWORD" \
  < packages/db/prisma/sql/init-roles.sql

dc up -d api web
dc logs -f api web
```

Faça um backup manual antes de qualquer atualização com migration nova.
