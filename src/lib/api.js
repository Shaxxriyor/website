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
    if (res.status === 401 && !['auth', 'me', 'leaderboard', 'els'].includes(path)) onUnauthorized();
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
  leaderboard: (period) => request('leaderboard', { params: { period } }),
  elsProgress: () => request('els'),
  elsDay: (day) => request('els', { params: { day } }),
  elsUpload: (day, image) => request('els', { body: { action: 'upload', day, image } }),
  elsDelete: (id) => request('els', { body: { action: 'delete', id } }),
  me: () => request('me'),
  studentLogin: (code) => request('me', { body: { action: 'login', code } }),
  studentLogout: () => request('me', { body: { action: 'logout' } }),
};

/** URL of one ELS translation photo (served only to signed-in users). */
export const photoUrl = (id) => `./api/photo?id=${id}`;

/** Shrink a phone photo to at most 1600px and re-encode as JPEG (~200–400 KB). */
export async function compressImage(file, max = 1600, quality = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new ApiError('That file is not a photo.', 0));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
