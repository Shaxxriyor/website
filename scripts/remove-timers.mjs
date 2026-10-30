// Takes the time limit out of every test page: no countdown runs out, nothing is
// submitted automatically, and no pace warnings appear. The clocks themselves are
// hidden by public/track.js. Safe to run again (already-changed pages are skipped).
// Run after adding new tests: npm run remove-timers
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RULES = [
  {
    name: 'reading: no automatic submit when the 20/60 minutes run out',
    dirs: ['content/practice/reading', 'content/marathon/reading'],
    find: /if \(state\.timers\[section\] <= 0\) \{\s*pauseTimer\(\);\s*if \(onExpire\) onExpire\(\);\s*\}/,
    replace: '/* READING_CDI: no time limit */',
  },
  {
    name: 'reading: no pace warnings',
    dirs: ['content/practice/reading', 'content/marathon/reading'],
    find: "if (section === 'reading') { checkPace(state.timers[section]); checkPassagePace(); }",
    replace: '/* READING_CDI: no pace warnings */',
  },
  {
    name: 'listening practice: no "Time is up" submit',
    dirs: ['content/practice/listening'],
    find: 'if(state.timers[section]<=0){pauseTimer();timeUp(onExpire);}',
    replace: '/* READING_CDI: no time limit */',
  },
  {
    name: 'listening marathon: no countdown after the audio ends',
    dirs: ['content/marathon/listening'],
    find: 'if(checkLeft <= 0){ clearInterval(checkTimer); finish(); }',
    replace: '/* READING_CDI: no time limit */',
  },
  {
    name: 'reading: start screen says there is no time limit',
    dirs: ['content/practice/reading', 'content/marathon/reading'],
    find: /You have <b>\d+ minutes<\/b> for (Questions [^.]+)\./,
    replace: 'There is <b>no time limit</b> for $1.',
    done: 'There is <b>no time limit</b> for',
  },
  {
    name: 'reading: no minutes in the start screen heading',
    dirs: ['content/practice/reading', 'content/marathon/reading'],
    find: /( &middot; )\d+ minutes<\/p>/,
    replace: '$1no time limit</p>',
    done: '&middot; no time limit</p>',
  },
];

for (const rule of RULES) {
  let changed = 0;
  let missing = 0;
  for (const dir of rule.dirs) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
      const path = join(dir, file);
      const html = readFileSync(path, 'utf8');
      if (html.includes(rule.done ?? rule.replace)) continue;
      const next = html.replace(rule.find, rule.replace);
      if (next === html) {
        missing++;
        continue;
      }
      writeFileSync(path, next);
      changed++;
    }
  }
  console.log(`${rule.name}: ${changed} changed${missing ? `, ${missing} without this code` : ''}`);
}
