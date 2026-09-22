import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './http';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createHttpClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('attaches the bearer token and base url', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    const client = createHttpClient('https://api.test', async () => 'abc');

    await client.get('/accounts/me/statement');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/accounts/me/statement');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer abc');
  });

  it('omits the authorization header when no token is available', async () => {
    const fetchMock = mockFetch(200, {});
    await createHttpClient('https://api.test', async () => null).get('/health');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).has('authorization')).toBe(false);
  });

  it('maps error envelopes to ApiError', async () => {
    mockFetch(422, { error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' } });
    const client = createHttpClient('https://api.test', async () => 'abc');

    await expect(client.post('/transfers', {})).rejects.toMatchObject({
      status: 422,
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds',
    });
  });
});
