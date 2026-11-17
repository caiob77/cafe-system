import type { UploadKind } from '@cafe/shared';

import { ApiError, apiClient } from '@/lib/api-client';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** MIME + extensões (maiúsculo/minúsculo) para o file picker do SO. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.JPG',
  '.JPEG',
  '.PNG',
  '.WEBP',
  '.HEIC',
  '.HEIF',
].join(',');

const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const ACCEPTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  params: Record<string, string>;
  signature: string;
};

export type UploadedImage = {
  url: string;
  publicId: string;
};

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  return name.slice(dot).toLowerCase();
}

export function isAcceptedImageFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  // Alguns SOs mandam .JPG sem MIME preenchido.
  return ACCEPTED_EXTENSIONS.has(fileExtension(file.name));
}

export async function uploadImage(file: File, kind: UploadKind): Promise<UploadedImage> {
  if (!isAcceptedImageFile(file)) {
    throw new Error('Use uma imagem JPG, PNG, WebP ou HEIC (iPhone).');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('A imagem precisa ter no máximo 5 MB.');
  }

  const { data } = await apiClient<{ data: UploadSignature }>('/api/v1/uploads/signature', {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', data.apiKey);
  form.append('signature', data.signature);
  for (const [key, value] of Object.entries(data.params)) {
    form.append(key, value);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const body = (await response.json().catch(() => null)) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !body?.secure_url || !body.public_id) {
    // A mensagem do Cloudinary pode ecoar credenciais (ex.: "Unknown API key 1234"),
    // então nunca chega à interface.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[uploadImage] Cloudinary error', response.status, body?.error?.message);
    }
    throw new ApiError({
      code: 'upload_failed',
      message: uploadErrorMessage(response.status),
      status: response.status,
    });
  }

  return { url: body.secure_url, publicId: body.public_id };
}

function uploadErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'O envio de imagens está indisponível no momento. Avise o suporte.';
  }
  if (status === 400) {
    return 'A imagem foi recusada. Tente JPG, PNG, WebP ou HEIC (iPhone).';
  }
  if (status === 420 || status === 429) {
    return 'Muitos envios em sequência. Aguarde um instante e tente de novo.';
  }
  return 'Não foi possível enviar a imagem. Tente novamente.';
}

/**
 * Para URLs do Cloudinary, pede uma versão recortada no tamanho exibido e no
 * melhor formato para o navegador. Outras URLs passam sem alteração.
 */
export function imageVariant(
  url: string,
  { width, height, crop = 'fill' }: { width: number; height?: number; crop?: 'fill' | 'limit' },
): string {
  const marker = '/image/upload/';
  if (!url.startsWith('https://res.cloudinary.com/') || !url.includes(marker)) return url;
  const size = [`w_${width}`, height ? `h_${height}` : null].filter(Boolean).join(',');
  return url.replace(marker, `${marker}f_auto,q_auto,c_${crop},${size}/`);
}
