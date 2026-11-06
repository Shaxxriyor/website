import { json, readBody, route, searchParams } from '../server/http.js';
import { currentAdmin, requireAdmin, requireStudent } from '../server/auth.js';
import { id } from '../server/model.js';
import { deleteMockResult, getMockResult, listMockResults, saveMockResult } from '../server/mock.js';

// Full mock test results. The teacher sees everyone's; a student sees their own.
export const GET = route(async (request) => {
  const params = searchParams(request);
  const teacher = Boolean(currentAdmin(request));
  const sid = teacher ? null : await requireStudent(request);
  if (params.get('id')) return json({ result: await getMockResult(id(params.get('id')), sid) });
  return json({ results: await listMockResults(sid) });
});

export const POST = route(async (request) => {
  const body = await readBody(request);
  if (body.action === 'save') {
    const sid = await requireStudent(request);
    return json(await saveMockResult(sid, body.result));
  }
  if (body.action === 'delete') {
    requireAdmin(request);
    return json(await deleteMockResult(id(body.id)));
  }
  return json({ error: 'Unknown action.' }, 400);
});
