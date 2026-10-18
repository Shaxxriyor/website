import { ApiError, json, readBody, route, searchParams } from '../server/http.js';
import { requireAdmin } from '../server/auth.js';
import { createStudent, deleteStudent, getStudent, id, listStudents, updateStudent } from '../server/model.js';

export const GET = route(async (request) => {
  requireAdmin(request);
  const studentId = searchParams(request).get('id');
  if (studentId) return json(await getStudent(id(studentId)));
  return json({ students: await listStudents() });
});

export const POST = route(async (request) => {
  requireAdmin(request);
  const body = await readBody(request);
  switch (body.action) {
    case 'create':
      return json({ id: await createStudent(body) }, 201);
    case 'update':
      await updateStudent(id(body.id), body);
      return json({ ok: true });
    case 'delete':
      await deleteStudent(id(body.id));
      return json({ ok: true });
    default:
      throw new ApiError('Unknown action.');
  }
});
