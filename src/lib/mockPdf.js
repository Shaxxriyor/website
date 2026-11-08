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

/** iPhone and iPad: a file can only be saved straight from a tap, not after the seconds the PDF takes. */
export const needsTapToSave = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Build the PDF of one saved result: { blob, name }. */
export async function makeMockPdf(id) {
  const [{ result }, [{ jsPDF }, { applyPlugin }], report] = await Promise.all([api.mockResult(id), pdfLibrary(), loadReport()]);
  try {
    sessionStorage.removeItem('rcdi_pdf_reload');
  } catch {
    /* storage blocked */
  }
  applyPlugin(jsPDF);
  const data = { ...result.data, name: result.full_name || result.data.name };
  const doc = await report.buildMockPdf(data, jsPDF);
  return { blob: doc.output('blob'), name: report.fileName(data) };
}

/** Save a built PDF (call it from a tap on iPhone). */
export async function savePdf({ blob, name }) {
  const file = typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null;
  if (needsTapToSave() && file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // closed the share sheet
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  if (needsTapToSave()) a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 60000);
}
