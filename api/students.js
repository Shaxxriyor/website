import { ApiError, json, readBody, route, searchParams } from '../server/http.js';
import { requireAdmin } from '../server/auth.js';
import { createStudent, deleteStudent, getStudent, id, listStudents, regenerateCode, setAvatar, updateStudent } from '../server/model.js';

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
      const { id: newId, access_code } = await createStudent(body);
      return json({ id: newId, access_code }, 201);
    case 'update':
      await updateStudent(id(body.id), body);
      return json({ ok: true });
    case 'delete':
      await deleteStudent(id(body.id));
      return json({ ok: true });
    case 'remove-avatar':
      await setAvatar(id(body.id), null);
      return json({ ok: true });
    case 'new-code':
      return json({ access_code: await regenerateCode(id(body.id)) });
    default:
      throw new ApiError('Unknown action.');
  }
});
