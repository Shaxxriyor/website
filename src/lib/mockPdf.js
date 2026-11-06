// Download a saved full mock result as the examiner's PDF (public/mock-report.mjs
// builds it; the same builder runs inside the mock page). Loaded only when asked.
import { api } from './api.js';

export async function downloadMockPdf(id) {
  const [{ result }, { jsPDF }, { applyPlugin }, report] = await Promise.all([
    api.mockResult(id),
    import('jspdf'),
    import('jspdf-autotable'),
    import(/* @vite-ignore */ `${import.meta.env.BASE_URL}mock-report.mjs`),
  ]);
  applyPlugin(jsPDF);
  const data = { ...result.data, name: result.full_name || result.data.name };
  const doc = await report.buildMockPdf(data, jsPDF);
  doc.save(report.fileName(data));
}
