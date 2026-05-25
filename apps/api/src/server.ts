import { buildApp } from './app.js';
import { env } from './lib/env.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT });
    app.log.info(
      `API rodando em http://${env.API_HOST === '0.0.0.0' ? 'localhost' : env.API_HOST}:${env.API_PORT}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, async () => {
      app.log.info(`Recebido ${sig}, encerrando...`);
      await app.close();
      process.exit(0);
    });
  }
}

void main();
