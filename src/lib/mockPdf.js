// Download a saved full mock result as the examiner's PDF (public/mock-report.mjs
// builds it; the same builder runs inside the mock page). Loaded only when asked.
import { api } from './api.js';

export async function downloadMockPdf(id) {
  const [{ result }, { jsPDF }, { applyPlugin }, report] = await Promise.all([
    api.mockResult(id),
    import('jspdf'),
    import('jspdf-autotable'),
    // Resolved against the page, not this file: with the relative build base ('./') a plain
    // './mock-report.mjs' would point into /assets/, where the file isn't.
    import(/* @vite-ignore */ new URL('mock-report.mjs', document.baseURI).href),
  ]);
  applyPlugin(jsPDF);
  const data = { ...result.data, name: result.full_name || result.data.name };
  const doc = await report.buildMockPdf(data, jsPDF);
  doc.save(report.fileName(data));
}
