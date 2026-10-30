// Dev only: serve the Vercel functions in /api from the Vite dev server,
// backed by a local PGlite database in .data/ unless DATABASE_URL is set.
export function devApi() {
  return {
    name: 'rcdi-dev-api',
    apply: 'serve',
    async configureServer(server) {
      if (!process.env.DATABASE_URL && !globalThis.__RCDI_DEV_DB__) {
        const { mkdirSync } = await import('node:fs');
        const { PGlite } = await import('@electric-sql/pglite');
        mkdirSync('.data', { recursive: true });
        globalThis.__RCDI_DEV_DB__ = new PGlite('.data/pglite');
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        // Course materials: same rewrite as vercel.json.
        const content = url.pathname.match(/^\/((?:marathon|practice|vocab)\/.+)$/);
        if (content) {
          url.searchParams.set('path', decodeURIComponent(content[1]));
          url.pathname = '/api/content';
        }
        const match = url.pathname.match(/\/api\/([a-z-]+)$/);
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`).catch(() => null);
          const handler = mod?.[req.method];
          if (!handler) {
            res.statusCode = mod ? 405 : 404;
            return res.end();
          }
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const request = new Request(url, {
            method: req.method,
            headers: req.headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => key !== 'set-cookie' && res.setHeader(key, value));
          const cookies = response.headers.getSetCookie();
          if (cookies.length) res.setHeader('set-cookie', cookies);
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.ssrFixStacktrace?.(err);
          next(err);
        }
      });
    },
  };
}
