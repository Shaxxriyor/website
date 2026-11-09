import { ApiError, json, readBody, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudent, requireAdmin, requireStudent } from '../server/auth.js';
import { id } from '../server/model.js';
import { deleteMark, deleteMockResult, getMockResult, listMockResults, mockTable, saveMarks, saveMockResult } from '../server/mock.js';

// Full mock test results. The teacher sees everyone's; a student sees their own.
export const GET = route(async (request) => {
  const params = searchParams(request);
  if (params.get('table')) {
    requireAdmin(request);
    return json({ rows: await mockTable(params.get('table')) });
  }
  const teacher = Boolean(currentAdmin(request));
  const sid = teacher ? null : await requireStudent(request);
  if (params.get('id')) return json({ result: await getMockResult(id(params.get('id')), sid) });
  return json({ results: await listMockResults(sid) });
});

export const POST = route(async (request) => {
  const body = await readBody(request);
  if (body.action === 'save') {
    const student = await currentStudent(request);
    if (!student) throw new ApiError('Please sign in.', 401);
    if (!student.access.includes('mock')) throw new ApiError('Your teacher has not opened Mock Tests for you yet.', 403);
    return json(await saveMockResult(student.id, body.result));
  }
  if (body.action === 'marks') {
    requireAdmin(request);
    return json(await saveMarks(body.mock, body.marks));
  }
  if (body.action === 'delete-mark') {
    requireAdmin(request);
    return json(await deleteMark(id(body.id)));
  }
  if (body.action === 'delete') {
    requireAdmin(request);
    return json(await deleteMockResult(id(body.id)));
  }
  return json({ error: 'Unknown action.' }, 400);
});
