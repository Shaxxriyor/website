import { ApiError, json, readBody, route, searchParams } from '../server/http.js';
import { requireAdmin } from '../server/auth.js';
import { SKILLS, createLessons, deleteLesson, id, listLessons } from '../server/model.js';

export const GET = route(async (request) => {
  requireAdmin(request);
  const q = searchParams(request);
  const skill = q.get('skill');
  const lessons = await listLessons({
    studentId: q.get('student_id') ? id(q.get('student_id'), 'student_id') : undefined,
    skill: SKILLS.includes(skill) ? skill : undefined,
    from: /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') || '') ? q.get('from') : undefined,
    to: /^\d{4}-\d{2}-\d{2}$/.test(q.get('to') || '') ? q.get('to') : undefined,
  });
  return json({ lessons });
});

export const POST = route(async (request) => {
  requireAdmin(request);
  const body = await readBody(request);
  switch (body.action) {
    case 'create':
      return json({ created: await createLessons(body) }, 201);
    case 'delete':
      await deleteLesson(id(body.id));
      return json({ ok: true });
    default:
      throw new ApiError('Unknown action.');
  }
});
