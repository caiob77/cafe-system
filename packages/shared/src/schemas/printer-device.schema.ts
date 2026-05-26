import { z } from 'zod';

const idString = z.string().min(1);

export const printerDeviceIdParamSchema = z.object({
  id: idString,
});

export const createPrinterDeviceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export type CreatePrinterDeviceInput = z.infer<typeof createPrinterDeviceSchema>;
