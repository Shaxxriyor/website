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
    if (res.status === 401 && !['auth', 'me', 'leaderboard', 'rating'].includes(path)) onUnauthorized();
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
  deleteAllStudents: (confirm) => request('students', { body: { action: 'delete-all', confirm } }),
  deleteStudent: (id) => request('students', { body: { action: 'delete', id } }),

  lessons: (params) => request('lessons', { params }),
  createLessons: (data) => request('lessons', { body: { action: 'create', ...data } }),
  deleteLesson: (id) => request('lessons', { body: { action: 'delete', id } }),

  overview: () => request('overview'),
  newCode: (id) => request('students', { body: { action: 'new-code', id } }),

  // Student side
  // "rating", not "leaderboard": content blockers in Safari block addresses with "leaderboard".
  leaderboard: (period) => request('rating', { params: { period } }),
  studentPage: (id) => request('rating', { params: { id } }),
  activityFeed: (before) => request('rating', { params: { feed: 1, before } }),
  me: () => request('me'),
  setAccess: (id, access) => request('students', { body: { action: 'access', id, access } }),
  studentLogin: (code) => request('me', { body: { action: 'login', code } }),
  signup: (data) => request('me', { body: { action: 'signup', ...data } }),
  emailLogin: (email, password) => request('me', { body: { action: 'email-login', email, password } }),
  studentLogout: () => request('me', { body: { action: 'logout' } }),
  saveVocab: (data) => request('me', { body: { action: 'vocab', ...data } }),
  vocabUnit: (book, unit) => fetch(`./vocab/${book}/unit-${String(unit).padStart(2, '0')}.json`, { credentials: 'same-origin' }),
  setAvatar: (image) => request('me', { body: { action: 'avatar', image } }),
  removeAvatar: () => request('me', { body: { action: 'avatar', image: null } }),
  teacherRemoveAvatar: (id) => request('students', { body: { action: 'remove-avatar', id } }),

  // Full mock tests: the teacher gets everyone's results, a student their own.
  mockResults: () => request('mock'),
  mockResult: (id) => request('mock', { params: { id } }),
  mockTable: (mock) => request('mock', { params: { table: mock } }),
  saveMockMarks: (mock, marks) => request('mock', { body: { action: 'marks', mock, marks } }),
  deleteMockMark: (id) => request('mock', { body: { action: 'delete-mark', id } }),
  deleteMockResult: (id) => request('mock', { body: { action: 'delete', id } }),
};

/** A student's profile photo; `v` changes whenever they replace it. */
export const avatarUrl = (studentId, v) => `./api/avatar?id=${studentId}&v=${v}`;

/** Center-crop a photo to a square of `size` px (JPEG) for profile pictures. */
export async function squareImage(file, size = 320) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new ApiError('That file is not a photo.', 0));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas
      .getContext('2d')
      .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
