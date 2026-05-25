export type ApiErrorBody = {
  error: {
    code?: string;
    message: string;
  };
};

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor({ code, message, status }: { code?: string; message: string; status: number }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError({
      code: body?.error.code,
      message: body?.error.message ?? 'Erro ao comunicar com a API.',
      status: response.status,
    });
  }

  return response.json() as Promise<T>;
}
