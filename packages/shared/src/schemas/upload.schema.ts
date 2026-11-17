import { z } from 'zod';

export const uploadKindValues = ['product', 'logo', 'banner', 'category'] as const;

export const createUploadSignatureSchema = z.object({
  kind: z.enum(uploadKindValues),
});

export type UploadKind = (typeof uploadKindValues)[number];
export type CreateUploadSignatureInput = z.infer<typeof createUploadSignatureSchema>;
