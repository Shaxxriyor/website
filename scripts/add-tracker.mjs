// Adds the progress tracker to every marathon page (safe to run again).
// Run after adding new days: npm run add-tracker
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TAG = '<script src="../../track.js" defer></script>';
let changed = 0;
for (const skill of ['reading', 'listening']) {
  const dir = join('public', 'marathon', skill);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
    const path = join(dir, file);
    const html = readFileSync(path, 'utf8');
    if (html.includes(TAG)) continue;
    const at = html.lastIndexOf('</body>');
    writeFileSync(path, at >= 0 ? html.slice(0, at) + TAG + '\n' + html.slice(at) : html + '\n' + TAG + '\n');
    changed++;
  }
}
console.log(`Tracker added to ${changed} page(s).`);
