// The full mock tests on the site. Each page is content/mock/<id>.html, imported with
// scripts/import-mock.mjs. Shared by the Mock Tests tab and the server (only these ids are saved).
export const MOCKS = [
  {
    id: 'full-mock-06-11-2026',
    title: 'Full Mock Test 06.11.2026',
    date: '2026-11-06',
    parts: 'Listening · Reading · Writing',
    minutes: 160,
  },
];

export const mockById = (id) => MOCKS.find((m) => m.id === id) ?? null;
