// Thin client for the /api functions. Paths are relative so the app works from any base.

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

async function request(path, { body, params } = {}) {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))}` : '';
  let res;
  try {
    res = await fetch(`./api/${path}${qs === '?' ? '' : qs}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json', 'x-requested-with': 'fetch' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== 'auth' && path !== 'me') onUnauthorized();
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields);
  }
  return data;
}

export const api = {
  session: () => request('auth'),
  login: (username, password) => request('auth', { body: { action: 'login', username, password } }),
  logout: () => request('auth', { body: { action: 'logout' } }),

  students: () => request('students'),
  student: (id) => request('students', { params: { id } }),
  createStudent: (data) => request('students', { body: { action: 'create', ...data } }),
  updateStudent: (id, data) => request('students', { body: { action: 'update', id, ...data } }),
  deleteStudent: (id) => request('students', { body: { action: 'delete', id } }),

  lessons: (params) => request('lessons', { params }),
  createLessons: (data) => request('lessons', { body: { action: 'create', ...data } }),
  deleteLesson: (id) => request('lessons', { body: { action: 'delete', id } }),

  overview: () => request('overview'),
  newCode: (id) => request('students', { body: { action: 'new-code', id } }),

  // Student side
  me: () => request('me'),
  studentLogin: (code) => request('me', { body: { action: 'login', code } }),
  studentLogout: () => request('me', { body: { action: 'logout' } }),
};
