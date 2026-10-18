import { ApiError, json, readBody, route, searchParams } from '../server/http.js';
import { currentAdmin, currentStudentId } from '../server/auth.js';
import { addElsPhoto, deleteElsPhoto, elsDay, elsProgress, id } from '../server/model.js';

// ELS Reading translations. Signed-in students and the teacher can see everyone's
// uploads (shared with the class, like the rating); students upload and delete their own.
async function viewer(request) {
  const student = await currentStudentId(request);
  const admin = currentAdmin(request);
  if (!student && !admin) throw new ApiError('Sign in with your code to see ELS Reading.', 401);
  return { student, admin };
}

export const GET = route(async (request) => {
  const { student } = await viewer(request);
  const day = searchParams(request).get('day');
  if (day) return json({ day: id(day, 'day'), students: await elsDay(id(day, 'day')), me: student });
  return json({ progress: await elsProgress(), me: student });
});

export const POST = route(async (request) => {
  const { student, admin } = await viewer(request);
  const body = await readBody(request);
  if (body.action === 'upload') {
    if (!student) throw new ApiError('Only students upload translations.', 403);
    return json({ id: await addElsPhoto(student, body) }, 201);
  }
  if (body.action === 'delete') {
    await deleteElsPhoto(id(body.id), { studentId: admin ? null : student });
    return json({ ok: true });
  }
  throw new ApiError('Unknown action.');
});
