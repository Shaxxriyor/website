import { json, route } from '../server/http.js';
import { requireAdmin } from '../server/auth.js';
import { overview } from '../server/model.js';

export const GET = route(async (request) => {
  requireAdmin(request);
  return json(await overview());
});
