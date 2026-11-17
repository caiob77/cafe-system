import { createHash } from 'node:crypto';
import type { UploadKind } from '@cafe/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { createUploadSignatureSchema } from './schemas.js';

function error(code: string, message: string) {
  return { error: { code, message } };
}

function tenantIdOrReply(request: FastifyRequest, reply: FastifyReply) {
  if (!request.tenantId) {
    void reply.code(403).send(error('tenant_required', 'Organização ativa obrigatória'));
    return null;
  }
  return request.tenantId;
}

// Transformação aplicada pelo Cloudinary antes de gravar: o original enorme do
// celular nunca é armazenado.
const INCOMING_TRANSFORMATION: Record<UploadKind, string> = {
  product: 'c_limit,w_1200,h_1200',
  logo: 'c_limit,w_512,h_512',
  banner: 'c_limit,w_1920,h_1080',
  category: 'c_limit,w_1600,h_1200',
};

// Formatos em minúsculo (Cloudinary detecta pelo conteúdo; .JPG/.HEIC ok).
// heic/heif: fotos do iPhone — o Cloudinary converte na entrada.
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic,heif';

/**
 * Assinatura do Cloudinary: SHA-1 de `chave=valor` ordenado por chave, unido
 * por `&`, concatenado com o api_secret. Tudo que vai assinado precisa ser
 * enviado idêntico pelo browser, senão o Cloudinary rejeita o upload.
 */
function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
}

export async function createUploadSignatureHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    request.server.config;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return reply
      .code(503)
      .send(error('uploads_disabled', 'Upload de imagens não configurado no servidor'));
  }

  const { kind } = createUploadSignatureSchema.parse(request.body);

  const org = await request.server.prisma.organization.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (!org) {
    return reply.code(404).send(error('organization_not_found', 'Organização não encontrada'));
  }

  // Contas novas usam "dynamic folders": `folder` só mexe no public_id e a
  // Media Library mostra tudo na raiz. `asset_folder` é o que organiza a UI;
  // `public_id_prefix` mantém o caminho também na URL de entrega.
  // Slug (não id) para achar a pasta na Media Library. Se o slug mudar, uploads
  // novos vão para a pasta nova; os antigos ficam onde estão.
  const assetFolder = `cafe/${org.slug}/${kind}`;
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    asset_folder: assetFolder,
    public_id_prefix: assetFolder,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    transformation: INCOMING_TRANSFORMATION[kind],
  };

  return {
    data: {
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      params,
      signature: signParams(params, CLOUDINARY_API_SECRET),
    },
  };
}
