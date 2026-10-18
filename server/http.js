// Small helpers shared by every /api function (Web Request/Response handlers).

export class ApiError extends Error {
  constructor(message, status = 400, fields = undefined) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

/** Wrap a handler so thrown ApiErrors become JSON responses and anything else a 500. */
export function route(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (err) {
      if (err instanceof ApiError || err.expose) {
        return json({ error: err.message, fields: err.fields }, err.status || 400);
      }
      console.error('[api]', err);
      return json({ error: 'Server error. Please try again.' }, 500);
    }
  };
}

/** JSON body of a write request. Requires our custom header, which forces a CORS preflight cross-site. */
export async function readBody(request) {
  if (request.headers.get('x-requested-with') !== 'fetch') {
    throw new ApiError('Bad request.', 400);
  }
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    /* fall through */
  }
  throw new ApiError('Invalid request body.', 400);
}

export function searchParams(request) {
  return new URL(request.url).searchParams;
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
}
