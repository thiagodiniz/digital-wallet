export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

export type TokenProvider = () => Promise<string | null>;

export interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export function createHttpClient(baseUrl: string, getToken: TokenProvider): HttpClient {
  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const token = await getToken();
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    if (token) headers.set('authorization', `Bearer ${token}`);

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) throw await toApiError(response);
    return (await response.json()) as T;
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  };
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  return new ApiError(
    response.status,
    body.error?.code ?? 'UNKNOWN',
    body.error?.message ?? response.statusText,
  );
}
