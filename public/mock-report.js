// The full mock test report as a PDF: scores, every Listening and Reading answer,
// and both Writing tasks with their pictures and the candidate's text, ready to
// hand to the examiner. Used by the mock page itself (public/mock-guard.js) and by
// the site's Mock results (src/lib/mockPdf.js). `jsPDF` must have the autoTable plugin.
//
// A plain script (not a module): it sets window.MockReport. Module scripts (.mjs) are refused by
// Safari when the host doesn't serve them as JavaScript, so this loads with a <script> tag.
//
// `r` is a saved mock result: { title, name, finishedAt, startedAt, res: { listening, reading },
//   w: { t1, t2 }, tasks: { 1: { text, image }, 2: { text, image } }, leaves: [{ at, type, mod }] }

(function () {
  'use strict';

  const LEAVE = { tab: 'switched tab or app', window: 'left the window', fullscreen: 'left full screen', back: 'pressed Back' };

  function safe(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’ʻʼ`´]/g, "'")
      .replace(/[“”«»]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/…/g, '...')
      .replace(/[✓✔]/g, 'v')
      .replace(/[✗✘]/g, 'x')
      .replace(/ /g, ' ')
      .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '?');
  }
  const words = (t) => (String(t || '').match(/[A-Za-z0-9À-ɏ][A-Za-z0-9À-ɏ'’-]*/g) || []).length;
  const when = (t) => {
    const d = new Date(t || Date.now());
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };
  // All four skills once the examiners' Writing and Speaking bands are in; until then Listening + Reading.
  function overall(r) {
    const L = r.res?.listening;
    const R = r.res?.reading;
    if (!L || !R) return '';
    const m = r.marks || {};
    const b = m.writing != null && m.speaking != null ? [L.band, R.band, m.writing, m.speaking] : [L.band, R.band];
    return (Math.round((b.reduce((s, x) => s + Number(x), 0) / b.length) * 2) / 2).toFixed(1);
  }
  const mark = (x) => (!String(x.ua || '').trim() ? 'x (no answer)' : x.got === x.of ? 'correct' : x.got ? `x (${x.got} of ${x.of})` : 'x');

  async function picture(src) {
    if (!src) return null;
    try {
      const blob = await (await fetch(src)).blob();
      const url = await new Promise((ok, no) => {
        const f = new FileReader();
        f.onload = () => ok(f.result);
        f.onerror = no;
        f.readAsDataURL(blob);
      });
      const img = await new Promise((ok, no) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = no;
        i.src = url;
      });
      // Re-encode as JPEG so any picture type works in the PDF.
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0);
      return { data: c.toDataURL('image/jpeg', 0.92), w: c.width, h: c.height };
    } catch {
      return null;
    }
  }

  async function buildMockPdf(r, jsPDF) {
    const L = r.res?.listening || { correct: 0, total: 40, band: '-', rows: [] };
    const R = r.res?.reading || { correct: 0, total: 40, band: '-', rows: [] };
    const w = r.w || {};
    const tasks = r.tasks || {};
    const leaves = r.leaves || [];
    const marks = r.marks || {};
    const title = r.title || 'Full Mock Test';
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15;
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(214, 40, 47);
    doc.text('READING_CDI', M, y);
    doc.setTextColor(0);
    y += 8;
    doc.setFontSize(16);
    doc.text(safe(`${title} - Result report`), M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(safe(`Candidate: ${r.name || ''}`), M, y);
    y += 5;
    doc.text(safe(`Finished: ${r.finishedAt ? when(r.finishedAt) : 'not finished'}${r.startedAt ? `     Started: ${when(r.startedAt)}` : ''}`), M, y);
    y += 4;

    const base = {
      theme: 'grid',
      margin: { left: M, right: M },
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 1.8, lineColor: [200, 200, 200], lineWidth: 0.2, textColor: 0 },
      headStyles: { fillColor: [242, 242, 242], textColor: 0, fontStyle: 'bold' },
    };
    const w1 = words(w.t1);
    const w2 = words(w.t2);
    doc.autoTable({
      ...base,
      startY: y,
      head: [['Module', 'Correct', 'Band']],
      body: [
        ['Listening', r.res?.listening ? `${L.correct} / ${L.total || 40}` : 'not taken', r.res?.listening ? L.band : '-'],
        ['Reading', r.res?.reading ? `${R.correct} / ${R.total || 40}` : 'not taken', r.res?.reading ? R.band : '-'],
        ['Writing', `Task 1: ${w1} words, Task 2: ${w2} words`, marks.writing != null ? Number(marks.writing).toFixed(1) : 'for the examiner'],
        ['Speaking', marks.speaking_parts ? `F / L / G / P: ${marks.speaking_parts}` : '', marks.speaking != null ? Number(marks.speaking).toFixed(1) : '-'],
        [marks.writing != null && marks.speaking != null ? 'Overall (all four skills)' : 'Overall (Listening + Reading)', '', overall(r) || '-'],
        ['Left the test window', leaves.length ? `${leaves.length} time${leaves.length === 1 ? '' : 's'}` : 'never', ''],
      ],
      didParseCell: (d) => {
        if (d.section === 'body' && d.row.index === 4) d.cell.styles.fontStyle = 'bold';
        if (d.section === 'body' && d.row.index === 5 && leaves.length) d.cell.styles.textColor = [200, 20, 40];
      },
    });

    if (leaves.length) {
      let yy = doc.lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Times the candidate left the test', M, yy);
      doc.autoTable({
        ...base,
        startY: yy + 3,
        head: [['#', 'Time', 'What happened', 'During']],
        body: leaves.map((l, i) => [
          i + 1,
          new Date(l.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          LEAVE[l.type] || l.type,
          l.mod ? l.mod[0].toUpperCase() + l.mod.slice(1) : 'between parts',
        ]),
        columnStyles: { 0: { cellWidth: 10 } },
      });
    }

    const answers = (heading, rows) => {
      let yy = doc.lastAutoTable.finalY + 9;
      if (yy > H - 30) {
        doc.addPage();
        yy = 18;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(safe(heading), M, yy);
      doc.autoTable({
        ...base,
        startY: yy + 3,
        head: [['Q', 'Answer', 'Correct answer', 'Result']],
        body: rows.map((x) => [x.q, safe(x.ua || '(blank)'), safe(x.ca), mark(x)]),
        columnStyles: { 0: { cellWidth: 14, fontStyle: 'bold' }, 3: { cellWidth: 28 } },
        didParseCell: (d) => {
          if (d.section !== 'body' || (d.column.index !== 3 && d.column.index !== 1)) return;
          const x = rows[d.row.index];
          if (x.got !== x.of) d.cell.styles.textColor = d.column.index === 3 ? [200, 20, 40] : [150, 20, 30];
          else if (d.column.index === 3) d.cell.styles.textColor = [40, 125, 20];
        },
      });
    };
    if (L.rows?.length) answers(`Listening - ${L.correct} / ${L.total || 40} - Band ${L.band}`, L.rows);
    [1, 2, 3].forEach((p) => {
      const rs = (R.rows || []).filter((x) => Number(x.part) === p);
      if (rs.length) answers(`Reading Passage ${p} - ${rs.filter((x) => x.got).length} / ${rs.length}`, rs);
    });

    // Writing: each task on its own page, with the task picture, for the examiner.
    for (const n of [1, 2]) {
      const task = tasks[n] || {};
      const text = w[`t${n}`];
      doc.addPage();
      let yy = 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(safe(`Writing Task ${n}`), M, yy);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(safe(`${words(text)} words - ${n === 1 ? 'at least 150' : 'at least 250'} required`), W - M, yy, { align: 'right' });
      yy += 6;
      if (task.text) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.splitTextToSize(safe(task.text), W - 2 * M).forEach((l) => {
          doc.text(l, M, yy);
          yy += 4.4;
        });
        yy += 2;
      }
      const pic = await picture(task.image);
      if (pic) {
        let iw = W - 2 * M;
        let ih = (pic.h / pic.w) * iw;
        const maxH = 110;
        if (ih > maxH) {
          ih = maxH;
          iw = (pic.w / pic.h) * ih;
        }
        doc.addImage(pic.data, 'JPEG', M + (W - 2 * M - iw) / 2, yy, iw, ih);
        yy += ih + 6;
      }
      doc.setDrawColor(200);
      doc.line(M, yy, W - M, yy);
      yy += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("Candidate's answer", M, yy);
      yy += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const lines = String(text || '').trim() ? safe(text).split(/\r?\n/) : ['(no answer written)'];
      for (const para of lines) {
        for (const l of para.trim() ? doc.splitTextToSize(para, W - 2 * M) : ['']) {
          if (yy > H - 16) {
            doc.addPage();
            yy = 18;
          }
          doc.text(l, M, yy);
          yy += 5.6;
        }
      }
      // Space for the examiner's marks.
      if (yy > H - 50) {
        doc.addPage();
        yy = 18;
      }
      yy += 6;
      doc.setDrawColor(160);
      doc.rect(M, yy, W - 2 * M, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Examiner - Task ${n}`, M + 3, yy + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(n === 1 ? 'TA ____   CC ____   LR ____   GRA ____   Band ____' : 'TR ____   CC ____   LR ____   GRA ____   Band ____', M + 3, yy + 13);
    }

    // The examiner's feedback, when there is some.
    if (String(marks.feedback || '').trim()) {
      doc.addPage();
      let yy = 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Writing feedback', M, yy);
      yy += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      for (const para of safe(marks.feedback).split(/\r?\n/)) {
        for (const l of para.trim() ? doc.splitTextToSize(para, W - 2 * M) : ['']) {
          if (yy > H - 16) {
            doc.addPage();
            yy = 18;
          }
          doc.text(l, M, yy);
          yy += 5.4;
        }
      }
    }

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      doc.text(safe(`${r.name || ''} - ${title}`), M, H - 8);
      doc.text(`${i} / ${pages}`, W - M, H - 8, { align: 'right' });
      doc.setTextColor(0);
    }
    return doc;
  }

  const fileName = (r) => `${String(r.name || 'Candidate').replace(/[\\/:*?"<>|]+/g, '').trim()} - ${r.title || 'Mock test'}.pdf`;

  window.MockReport = { safe, words, overall, buildMockPdf, fileName };
})();
