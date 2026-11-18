# Fluxo de deploy em produção

Como levar uma mudança do seu PC para https://pedidosystem.com.br depois do
primeiro deploy. O primeiro deploy (servidor vazio, certificado, seed) está em
[producao.md](./producao.md).

Toda mudança vai para produção por git: você testa e faz push no `main`, e o
VPS faz `git pull`, build e sobe os containers novos. **Nunca edite código
direto no VPS.** O único arquivo que vive só lá é o `.env.production`.

| Item | Valor |
| --- | --- |
| Site | https://pedidosystem.com.br |
| Acesso | `ssh root@2.27.112.34` (chave `~/.ssh/id_ed25519`) |
| Pasta do projeto | `/root/cafe-system` |
| Variáveis de produção | `/root/cafe-system/.env.production` (fora do git) |
| Containers | `cafe-postgres-prod`, `cafe-redis-prod`, `cafe-api-prod`, `cafe-web-prod`, `cafe-nginx-prod`, `cafe-certbot-prod` |

Em todos os comandos abaixo, `dc` é um atalho. Rode uma vez por sessão no VPS
(ou coloque no `~/.bashrc` do root para ficar permanente):

```bash
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.production'
```

```
PC local                    GitHub                 VPS (/root/cafe-system)
─────────                   ──────                 ───────────────────────
typecheck/lint/build  ──►   git push main   ──►    git pull
                                                   [backup, se tem migration]
                                                   dc build api web
                                                   [migrate + SQL, se tem migration]
                                                   dc up -d api web
                                                   health check + logs
```

---

## Atualizar depois do primeiro deploy (resumo)

A sequência completa, para copiar e colar. Os passos marcados com
`[migration]` só são necessários quando o `git pull` trouxer pasta nova em
`packages/db/prisma/migrations/`. Os detalhes de cada passo estão nas seções 1
a 4.

```bash
# --- No seu PC ---
pnpm typecheck && pnpm lint && pnpm build
git push origin main

# --- No VPS ---
ssh root@2.27.112.34
cd /root/cafe-system
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.production'

git pull
./scripts/backup-db.sh                                   # [migration]
dc build api web

set -a && . ./.env.production && set +a                 # [migration]
dc run --rm --no-deps -T \
  -e DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB?schema=public" \
  api sh -c "cd /app/packages/db && npx prisma migrate deploy"   # [migration]
dc exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < packages/db/prisma/sql/post-migrate.sql              # [migration]
dc exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v runtime_pw="$RUNTIME_DB_PASSWORD" -v admin_pw="$ADMIN_DB_PASSWORD" \
  < packages/db/prisma/sql/init-roles.sql                # [migration]

dc up -d api web
dc logs -f --tail 50 api web                             # Ctrl+C para sair
curl https://pedidosystem.com.br/api/health              # {"status":"ok",...,"db":"ok"}
```

---

## 1. Antes de subir (no seu PC)

Só suba o que passou typecheck, lint e build localmente. Um build quebrado no
VPS não derruba o site (a versão antiga continua no ar), mas trava o deploy.

```bash
pnpm typecheck
pnpm lint
pnpm build
```

- [ ] Typecheck, lint e build passaram.
- [ ] Mudou o `schema.prisma`? Gere a migration localmente
      (`pnpm --filter @cafe/db db:migrate --name <nome>`) e faça commit da
      pasta nova em `packages/db/prisma/migrations/`.
- [ ] Variável de ambiente nova? Acrescente no `.env.production.example` e, à
      mão, no `.env.production` do VPS **antes** do deploy.
- [ ] Variável `NEXT_PUBLIC_*` nova? Ela é embutida no build do `web`, então
      também precisa estar em `build.args` do serviço `web` no
      `docker-compose.prod.yml`.
- [ ] Commit e push: `git push origin main`.

---

## 2. Atualização padrão (sem migration)

Leva poucos minutos. O site fica no ar com a versão antiga até o passo 3.

```bash
ssh root@2.27.112.34
cd /root/cafe-system

# 1. Baixa o código novo
git pull

# 2. Gera as imagens novas (a versão atual continua no ar enquanto isso)
dc build api web

# 3. Troca os containers pela versão nova
dc up -d api web

# 4. Acompanha a subida (Ctrl+C para sair)
dc logs -f --tail 50 api web
```

Atalhos:

| Mudou só... | Comandos |
| --- | --- |
| o site (`apps/web`) | `dc build web && dc up -d web` |
| a API (`apps/api`, `packages/*`) | `dc build api && dc up -d api` |
| o `.env.production` | `dc up -d api web` (recria com as variáveis novas; `NEXT_PUBLIC_*` exige `dc build web` antes) |
| o `nginx/` | `dc exec nginx nginx -t && dc exec nginx nginx -s reload` |

---

## 3. Atualização com migration nova

Quando o `git pull` trouxer pasta nova em `packages/db/prisma/migrations/`.
Ordem importa: **backup → build → migrate → SQL → subir**.

```bash
cd /root/cafe-system
git pull

# 1. Backup antes de tudo (guarda o nome do arquivo que ele imprimir)
./scripts/backup-db.sh

# 2. Build
dc build api web

# 3. Migrations rodam como owner: a role cafe_runtime (usada pela API com RLS)
#    não tem permissão de alterar tabelas
set -a && . ./.env.production && set +a
dc run --rm --no-deps -T \
  -e DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB?schema=public" \
  api sh -c "cd /app/packages/db && npx prisma migrate deploy"

# 4. Reaplica policies de RLS e grants (podem rodar de novo sem efeito colateral;
#    sem isso as tabelas novas ficam sem RLS e sem permissão para cafe_runtime)
dc exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < packages/db/prisma/sql/post-migrate.sql
dc exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v runtime_pw="$RUNTIME_DB_PASSWORD" -v admin_pw="$ADMIN_DB_PASSWORD" \
  < packages/db/prisma/sql/init-roles.sql

# 5. Sobe a versão nova
dc up -d api web
dc logs -f --tail 50 api
```

O passo 3 usa `dc run` (container avulso, com a imagem nova) em vez de
`dc exec`: assim a migration roda mesmo se a API atual estiver reiniciando.

Cuidados com migrations em produção:

- Prefira migrations que **adicionam** (coluna nova opcional, tabela nova).
  Renomear ou apagar coluna quebra a versão antiga da API, que continua no ar
  até o passo 5.
- Coluna nova obrigatória (`NOT NULL`) em tabela com dados precisa de `DEFAULT`,
  senão a migration falha.
- **Nunca** rode `prisma migrate dev`, `db:push`, `db:reset` ou `db:seed` em
  produção. O seed apaga todos os dados.

---

## 4. Conferir se deu certo

```bash
# No VPS
dc ps                        # todos "Up"; postgres e redis "(healthy)"
dc logs --tail 30 api        # deve terminar em "Server listening"

# De qualquer lugar
curl https://pedidosystem.com.br/api/health
# {"status":"ok","uptime":...,"db":"ok"}
```

No navegador (de preferência no celular, fora do Wi-Fi do café):

- [ ] `https://pedidosystem.com.br/login` entra no painel.
- [ ] `https://pedidosystem.com.br/loja/cafe-do-sena` abre a loja.
- [ ] A funcionalidade que você mudou funciona.

Se a API ficar reiniciando (`dc ps` mostrando `Restarting` ou `Up 2 seconds`),
veja o erro com `dc logs --tail 80 api`.

---

## 5. Deu errado: voltar atrás

### Voltar o código (sem migration envolvida)

```bash
cd /root/cafe-system
git log --oneline -5             # acha o commit que estava funcionando
git checkout <commit-bom>        # VPS fica em "detached HEAD", tudo bem
dc build api web && dc up -d api web
```

Depois corrija no seu PC, faça push, e no VPS volte para o `main`:

```bash
git checkout main && git pull
dc build api web && dc up -d api web
```

### Voltar o banco (migration deu problema)

Prisma não desfaz migration sozinho. Se a migration estragou dados, restaure o
backup feito no passo 3.1:

```bash
dc stop api                                   # ninguém escreve durante o restore
docker exec cafe-postgres-prod ls /backups    # lista os dumps
docker exec cafe-postgres-prod pg_restore -U cafe -d cafe --clean /backups/cafe-AAAA-MM-DD-HHMM.dump
git checkout <commit-de-antes-da-migration>
dc build api && dc up -d api
```

Pedidos feitos entre o backup e o restore são perdidos. Por isso: backup
imediatamente antes, e deploy com migration fora do horário de movimento.

---

## 6. Problemas conhecidos e comandos úteis

### Build trava em `apk add` ou `pnpm install`

A placa de rede do VPS usa MTU 1450 e o Docker usava 1500: o DNS funciona, mas
downloads HTTPS de dentro dos containers ficam parados. Já corrigido no
`/etc/docker/daemon.json`:

```json
{
  "mtu": 1450,
  "default-network-opts": { "bridge": { "com.docker.network.driver.mtu": "1450" } }
}
```

Se recriar o VPS ou reinstalar o Docker, recrie esse arquivo e rode
`systemctl restart docker`.

### Comandos do dia a dia

| Para... | Comando |
| --- | --- |
| ver o estado dos containers | `dc ps` |
| logs ao vivo | `dc logs -f --tail 50 api` (ou `web`, `nginx`) |
| reiniciar só a API | `dc restart api` |
| abrir o banco | `dc exec postgres psql -U cafe -d cafe` |
| backup manual | `./scripts/backup-db.sh` |
| espaço em disco | `df -h /` e `docker system df` |
| limpar imagens antigas | `docker image prune -f` (seguro; não toca em volumes) |
| ver validade do certificado | `dc run --rm --entrypoint "certbot certificates" certbot` |
| ver nomes das variáveis do env | `grep -oE "^[A-Z_]+=" .env.production` |

**Nunca rode** `docker compose down -v` nem `docker volume prune`: o `-v` apaga
os volumes, e com eles o banco, os backups e o certificado.

### Certificado SSL

Renova sozinho (container `certbot`, a cada 12 h; vence em 16/02/2027 e é
renovado uns 30 dias antes). Se o site der erro de certificado, veja
`dc logs certbot` e rode `dc exec nginx nginx -s reload`.

### Pendências do servidor

- [ ] Agendar o backup diário no `crontab -e` do root:
      `0 3 * * * cd /root/cafe-system && ./scripts/backup-db.sh >> /var/log/cafe-backup.log 2>&1`
- [ ] Guardar o token da impressora (`/root/seed-output.txt`) no gerenciador
      de senhas e apagar o arquivo.
- [ ] Guardar uma cópia do `.env.production` no gerenciador de senhas e apagar
      o `.env.production.bak-202611181707`.
- [ ] (Opcional) DNS e certificado para `www.pedidosystem.com.br`.
