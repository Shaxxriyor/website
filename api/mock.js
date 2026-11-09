import { ApiError, json, readBody, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudent, requireAdmin, requireStudent } from '../server/auth.js';
import { id } from '../server/model.js';
import { query } from '../server/db.js';
import { lastErrors } from '../server/seeds.js';
import { deleteMark, deleteMockResult, getMockResult, listMockResults, mockTable, saveMarks, saveMockResult } from '../server/mock.js';

// Full mock test results. The teacher sees everyone's; a student sees their own.
export const GET = route(async (request) => {
  const params = searchParams(request);
  // The teacher's check page: one-time changes applied, their last errors, and Marjona's records.
  if (params.get('check')) {
    requireAdmin(request);
    const seeds = await query(`SELECT id, applied_at FROM data_seeds ORDER BY applied_at`);
    const students = await query(
      `SELECT s.id, s.full_name, s.status,
         (SELECT json_agg(json_build_object('result', r.id, 'listening', r.listening_band, 'reading', r.reading_band,
            'finished', r.finished_at, 'updated', r.updated_at, 'words', r.writing_words) ORDER BY r.updated_at)
          FROM mock_results r WHERE r.student_id = s.id) AS sittings
       FROM students s WHERE lower(full_name) LIKE '%marjona%' OR lower(full_name) LIKE '%rasul%'`,
    );
    return json({ seeds, errors: lastErrors, marjona: students });
  }
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
