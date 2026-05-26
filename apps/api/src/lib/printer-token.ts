import { createHash, randomBytes } from 'node:crypto';

export const PRINTER_TOKEN_PREFIX = 'pd_';

export function generatePrinterToken(): string {
  return `${PRINTER_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export function hashPrinterToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, value] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  if (!value.startsWith(PRINTER_TOKEN_PREFIX)) return null;
  return value;
}
