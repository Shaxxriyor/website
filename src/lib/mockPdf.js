// Download a saved full mock result as the examiner's PDF (public/mock-report.js
// builds it; the same builder runs inside the mock page). Loaded only when asked.
import { api } from './api.js';

// A plain <script> (not import()): Safari refuses a module the host doesn't serve as JavaScript.
let loading = null;
function loadReport() {
  if (window.MockReport) return Promise.resolve(window.MockReport);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    // Resolved against the page: with the relative build base a plain path would point into /assets/.
    s.src = new URL('mock-report.js?v=2', document.baseURI).href;
    s.onload = () => (window.MockReport ? resolve(window.MockReport) : reject(new Error('The PDF maker did not load.')));
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error('The PDF maker could not be loaded. Check the internet and try again.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// A phone that kept the site open across an update still runs the old app, whose PDF files no
// longer exist ("Importing a module script failed"): reload once to get the new version.
const STALE = /module script|dynamically imported module|Failed to fetch|Load failed|error loading/i;
async function pdfLibrary() {
  try {
    return await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  } catch (err) {
    let reloaded = false;
    try {
      reloaded = sessionStorage.getItem('rcdi_pdf_reload') === '1';
      sessionStorage.setItem('rcdi_pdf_reload', '1');
    } catch {
      /* storage blocked */
    }
    if (STALE.test(String(err?.message)) && !reloaded) {
      window.location.reload();
      return new Promise(() => {});
    }
    throw new Error('The PDF maker could not be loaded. Reload the page and try again.');
  }
}

export async function downloadMockPdf(id) {
  const [{ result }, [{ jsPDF }, { applyPlugin }], report] = await Promise.all([api.mockResult(id), pdfLibrary(), loadReport()]);
  try {
    sessionStorage.removeItem('rcdi_pdf_reload');
  } catch {
    /* storage blocked */
  }
  applyPlugin(jsPDF);
  const data = { ...result.data, name: result.full_name || result.data.name };
  const doc = await report.buildMockPdf(data, jsPDF);
  doc.save(report.fileName(data));
}
